import asyncio
import base64
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path  # Import Path for directory handling
from typing import Any, Awaitable, Dict, List, Optional, Union, Set

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..dataset.ds_util import get_ds_column_names, get_ds_iterator
from ..execution.task_recorder import TaskRecorder
from ..execution.workflow_execution_context import WorkflowExecutionContext
from ..execution.workflow_executor import WorkflowExecutor
from ..models.dataset_model import DatasetModel
from ..models.output_file_model import OutputFileModel
from ..models.run_model import RunModel, RunStatus
from ..models.task_model import TaskStatus
from ..models.workflow_model import WorkflowModel
from ..nodes.factory import NodeFactory
from ..nodes.logic.human_intervention import HumanInterventionNodeOutput, PauseException
from ..schemas.pause_schemas import (
    PauseHistoryResponseSchema,
    PausedWorkflowResponseSchema,
)
from ..schemas.run_schemas import (
    BatchRunRequestSchema,
    PartialRunRequestSchema,
    ResumeRunRequestSchema,
    RunResponseSchema,
    StartRunRequestSchema,
)
from ..schemas.workflow_schemas import WorkflowDefinitionSchema
from ..utils.workflow_version_utils import fetch_workflow_version

router = APIRouter()


async def create_run_model(
    workflow_id: str,
    workflow_version_id: str,
    initial_inputs: Dict[str, Dict[str, Any]],
    parent_run_id: Optional[str],
    run_type: str,
    db: Session,
) -> RunModel:
    new_run = RunModel(
        workflow_id=workflow_id,
        workflow_version_id=workflow_version_id,
        status=RunStatus.PENDING,
        initial_inputs=initial_inputs,
        start_time=datetime.now(timezone.utc),
        parent_run_id=parent_run_id,
        run_type=run_type,
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    return new_run


def process_embedded_files(
    workflow_id: str,
    initial_inputs: Dict[str, Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """
    Process any embedded files in the initial inputs and save them to disk.
    Returns updated inputs with file paths instead of data URIs.
    """
    processed_inputs = initial_inputs.copy()

    # Iterate through the values to find data URIs recursively
    def find_and_replace_data_uris(data: Any) -> Any:
        if isinstance(data, dict):
            return {str(k): find_and_replace_data_uris(v) for k, v in data.items()}  # type: ignore
        elif isinstance(data, list):
            return [find_and_replace_data_uris(item) for item in data]  # type: ignore
        elif isinstance(data, str) and data.startswith("data:"):
            return save_embedded_file(data, workflow_id)
        else:
            return data

    processed_inputs = find_and_replace_data_uris(processed_inputs)
    return processed_inputs


@router.post(
    "/{workflow_id}/run/",
    response_model=Dict[str, Any],
    description="Run a workflow and return the outputs",
)
async def run_workflow_blocking(
    workflow_id: str,
    request: StartRunRequestSchema,
    db: Session = Depends(get_db),
    run_type: str = "interactive",
) -> Dict[str, Any]:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow_version = fetch_workflow_version(workflow_id, workflow, db)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow_version.definition)

    initial_inputs = request.initial_inputs or {}

    # Process any embedded files in the inputs
    initial_inputs = process_embedded_files(workflow_id, initial_inputs)

    # Handle file paths if present
    if request.files:
        for node_id, file_paths in request.files.items():
            if node_id in initial_inputs:
                initial_inputs[node_id]["files"] = file_paths

    new_run = await create_run_model(
        workflow_id,
        workflow_version.id,
        initial_inputs,
        request.parent_run_id,
        run_type,
        db,
    )
    task_recorder = TaskRecorder(db, new_run.id)
    context = WorkflowExecutionContext(
        workflow_id=workflow.id,
        run_id=new_run.id,
        parent_run_id=request.parent_run_id,
        run_type=run_type,
        db_session=db,
        workflow_definition=workflow_version.definition
    )
    executor = WorkflowExecutor(
        workflow=workflow_definition,
        task_recorder=task_recorder,
        context=context,
    )
    input_node = next(node for node in workflow_definition.nodes if node.node_type == "InputNode")

    try:
        outputs = await executor(initial_inputs[input_node.id])

        # Check if any tasks were paused
        has_paused_tasks = False
        paused_node_ids: List[str] = []
        for task in new_run.tasks:
            if task.status == TaskStatus.PAUSED:
                has_paused_tasks = True
                paused_node_ids.append(task.node_id)

        if has_paused_tasks:
            # If we have paused tasks, ensure the run is in a PAUSED state
            new_run.status = RunStatus.PAUSED

            # Get all blocked nodes from paused nodes
            all_blocked_nodes: Set[str] = set()
            for paused_node_id in paused_node_ids:
                blocked_nodes = executor.get_blocked_nodes(workflow_version.definition, paused_node_id)
                all_blocked_nodes.update(blocked_nodes)

            # Make sure all downstream nodes are in PENDING status
            for task in new_run.tasks:
                if task.status == TaskStatus.CANCELED and task.node_id in all_blocked_nodes:
                    # Update any CANCELED tasks that should be PENDING
                    task_recorder.update_task(
                        node_id=task.node_id,
                        status=TaskStatus.PENDING,
                        end_time=datetime.now(),
                        is_downstream_of_pause=True
                    )
        else:
            new_run.status = RunStatus.COMPLETED

        new_run.end_time = datetime.now(timezone.utc)
        new_run.outputs = {k: v.model_dump() for k, v in outputs.items()}
        db.commit()

        # Refresh the run to get the updated tasks
        db.refresh(new_run)
        return outputs
    except PauseException as e:
        # Make sure the run status is set to PAUSED
        new_run.status = RunStatus.PAUSED
        new_run.outputs = {k: v.model_dump() for k, v in executor.outputs.items() if v is not None}

        # Get all blocked nodes from paused nodes
        paused_node_ids = [task.node_id for task in new_run.tasks if task.status == TaskStatus.PAUSED]
        all_blocked_nodes: Set[str] = set()
        for paused_node_id in paused_node_ids:
            blocked_nodes = executor.get_blocked_nodes(workflow_version.definition, paused_node_id)
            all_blocked_nodes.update(blocked_nodes)

        # Make sure all downstream nodes are in PENDING status
        for task in new_run.tasks:
            if task.status == TaskStatus.CANCELED and task.node_id in all_blocked_nodes:
                # Update any CANCELED tasks that should be PENDING
                task_recorder.update_task(
                    node_id=task.node_id,
                    status=TaskStatus.PENDING,
                    end_time=datetime.now(),
                    is_downstream_of_pause=True
                )

        db.commit()
        # Refresh the run to get the updated tasks
        db.refresh(new_run)
        raise e


@router.post(
    "/{workflow_id}/start_run/",
    response_model=RunResponseSchema,
    description="Start a non-blocking workflow run and return the run details",
)
async def run_workflow_non_blocking(
    workflow_id: str,
    start_run_request: StartRunRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    run_type: str = "interactive",
) -> RunResponseSchema:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow_version = fetch_workflow_version(workflow_id, workflow, db)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow_version.definition)

    initial_inputs = start_run_request.initial_inputs or {}

    # Process any embedded files in the inputs
    initial_inputs = process_embedded_files(workflow_id, initial_inputs)

    new_run = await create_run_model(
        workflow_id,
        workflow_version.id,
        initial_inputs,
        start_run_request.parent_run_id,
        run_type,
        db,
    )

    async def run_workflow_task(run_id: str, workflow_definition: WorkflowDefinitionSchema):
        with next(get_db()) as session:
            run = session.query(RunModel).filter(RunModel.id == run_id).first()
            if not run:
                session.close()
                return
            run.status = RunStatus.RUNNING
            session.commit()
            task_recorder = TaskRecorder(session, run_id)
            context = WorkflowExecutionContext(
                workflow_id=run.workflow_id,
                run_id=run_id,
                parent_run_id=start_run_request.parent_run_id,
                run_type=run_type,
                db_session=session,
                workflow_definition=workflow_version.definition
            )
            executor = WorkflowExecutor(
                workflow=workflow_definition,
                task_recorder=task_recorder,
                context=context,
            )
            try:
                assert run.initial_inputs
                input_node = next(
                    node for node in workflow_definition.nodes if node.node_type == "InputNode"
                )
                outputs = await executor(run.initial_inputs[input_node.id])
                run.outputs = {k: v.model_dump() for k, v in outputs.items()}

                # Check if any tasks were paused
                has_paused_tasks = False
                paused_node_ids: List[str] = []
                for task in run.tasks:
                    if task.status == TaskStatus.PAUSED:
                        has_paused_tasks = True
                        paused_node_ids.append(task.node_id)

                if has_paused_tasks:
                    # If we have paused tasks, ensure the run is in a PAUSED state
                    run.status = RunStatus.PAUSED

                    # Get all blocked nodes from paused nodes
                    all_blocked_nodes: Set[str] = set()
                    for paused_node_id in paused_node_ids:
                        blocked_nodes = executor.get_blocked_nodes(workflow_version.definition, paused_node_id)
                        all_blocked_nodes.update(blocked_nodes)

                    # Make sure all downstream nodes are in PENDING status
                    for task in run.tasks:
                        if task.status == TaskStatus.CANCELED and task.node_id in all_blocked_nodes:
                            # Update any CANCELED tasks that should be PENDING
                            task_recorder.update_task(
                                node_id=task.node_id,
                                status=TaskStatus.PENDING,
                                end_time=datetime.now(),
                                is_downstream_of_pause=True
                            )
                else:
                    run.status = RunStatus.COMPLETED

                run.end_time = datetime.now(timezone.utc)
            except PauseException:
                # Make sure the run status is set to PAUSED
                run.status = RunStatus.PAUSED
                run.outputs = {k: v.model_dump() for k, v in executor.outputs.items() if v is not None}

                # Get all blocked nodes from paused nodes
                paused_node_ids = [task.node_id for task in run.tasks if task.status == TaskStatus.PAUSED]
                all_blocked_nodes: Set[str] = set()
                for paused_node_id in paused_node_ids:
                    blocked_nodes = executor.get_blocked_nodes(workflow_version.definition, paused_node_id)
                    all_blocked_nodes.update(blocked_nodes)

                # Make sure all downstream nodes are in PENDING status
                for task in run.tasks:
                    if task.status == TaskStatus.CANCELED and task.node_id in all_blocked_nodes:
                        # Update any CANCELED tasks that should be PENDING
                        task_recorder.update_task(
                            node_id=task.node_id,
                            status=TaskStatus.PENDING,
                            end_time=datetime.now(),
                            is_downstream_of_pause=True
                        )

                session.commit()
                # Refresh the run to get the updated tasks
                session.refresh(run)
                return  # Don't raise the exception so the background task can complete
            except Exception as e:
                run.status = RunStatus.FAILED
                run.end_time = datetime.now(timezone.utc)
                session.commit()
                raise e
            session.commit()

    background_tasks.add_task(run_workflow_task, new_run.id, workflow_definition)

    return new_run


@router.post(
    "/{workflow_id}/run_partial/",
    response_model=Dict[str, Any],
    description="Run a partial workflow and return the outputs",
)
async def run_partial_workflow(
    workflow_id: str,
    request: PartialRunRequestSchema,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow.definition)
    executor = WorkflowExecutor(workflow_definition)
    input_node = next(node for node in workflow_definition.nodes if node.node_type == "InputNode")
    initial_inputs = request.initial_inputs or {}
    try:
        outputs = await executor.run(
            input=initial_inputs.get(input_node.id, {}),
            node_ids=[request.node_id],
            precomputed_outputs=request.partial_outputs or {},
        )
        return outputs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{workflow_id}/start_batch_run/",
    response_model=RunResponseSchema,
    description="Start a batch run of a workflow over a dataset and return the run details",
)
async def batch_run_workflow_non_blocking(
    workflow_id: str,
    request: BatchRunRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RunResponseSchema:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow_version = fetch_workflow_version(workflow_id, workflow, db)

    dataset_id = request.dataset_id
    new_run = await create_run_model(workflow_id, workflow_version.id, {}, None, "batch", db)

    # parse the dataset
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # ensure ds columns match workflow inputs
    dataset_columns = get_ds_column_names(dataset.file_path)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow_version.definition)
    input_node = next(node for node in workflow_definition.nodes if node.node_type == "InputNode")
    input_node_id = input_node.id
    workflow_input_schema: Dict[str, str] = input_node.config["input_schema"]
    for col in workflow_input_schema.keys():
        if col not in dataset_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Input field '{col}' in input schema not found in the dataset",
            )

    # create output file
    output_file_name = f"output_{new_run.id}.jsonl"
    output_file_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "output_files", output_file_name
    )
    output_file = OutputFileModel(
        file_name=output_file_name,
        file_path=output_file_path,
    )
    db.add(output_file)
    db.commit()

    file_path = dataset.file_path

    mini_batch_size = request.mini_batch_size

    async def start_mini_batch_runs(
        file_path: str,
        workflow_id: str,
        workflow_input_schema: Dict[str, str],
        input_node_id: str,
        parent_run_id: str,
        background_tasks: BackgroundTasks,
        db: Session,
        mini_batch_size: int,
        output_file_path: str,
    ):
        ds_iter = get_ds_iterator(file_path)
        current_batch: List[Awaitable[Dict[str, Any]]] = []
        batch_count = 0
        for inputs in ds_iter:
            initial_inputs = {
                input_node_id: {k: v for k, v in inputs.items() if k in workflow_input_schema}
            }
            single_input_run_task = run_workflow_blocking(
                workflow_id=workflow_id,
                request=StartRunRequestSchema(
                    initial_inputs=initial_inputs, parent_run_id=parent_run_id
                ),
                db=db,
                run_type="batch",
            )
            current_batch.append(single_input_run_task)
            if len(current_batch) == mini_batch_size:
                minibatch_results = await asyncio.gather(*current_batch)
                current_batch = []
                batch_count += 1
                with open(output_file_path, "a") as output_file:
                    for output in minibatch_results:
                        output = {
                            node_id: output.model_dump() for node_id, output in output.items()
                        }
                        output_file.write(json.dumps(output) + "\n")

        if current_batch:
            results = await asyncio.gather(*current_batch)
            with open(output_file_path, "a") as output_file:
                for output in results:
                    output = {node_id: output.model_dump() for node_id, output in output.items()}
                    output_file.write(json.dumps(output) + "\n")

        with next(get_db()) as session:
            run = session.query(RunModel).filter(RunModel.id == parent_run_id).first()
            if not run:
                session.close()
                return
            run.status = RunStatus.COMPLETED
            run.end_time = datetime.now(timezone.utc)
            session.commit()

    background_tasks.add_task(
        start_mini_batch_runs,
        file_path,
        workflow_id,
        workflow_input_schema,
        input_node_id,
        new_run.id,
        background_tasks,
        db,
        mini_batch_size,
        output_file_path,
    )
    new_run.output_file_id = output_file.id
    db.commit()
    return new_run


@router.get(
    "/{workflow_id}/runs/",
    response_model=List[RunResponseSchema],
    description="List all runs of a workflow",
)
def list_runs(
    workflow_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    runs = (
        db.query(RunModel)
        .filter(RunModel.workflow_id == workflow_id)
        .order_by(RunModel.start_time.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Update run status based on task status
    for run in runs:
        if run.status != RunStatus.FAILED:
            failed_tasks = [task for task in run.tasks if task.status == TaskStatus.FAILED]
            running_and_pending_tasks = [
                task
                for task in run.tasks
                if task.status in [TaskStatus.PENDING, TaskStatus.RUNNING]
            ]
            if failed_tasks and len(running_and_pending_tasks) == 0:
                run.status = RunStatus.FAILED
                db.commit()
                db.refresh(run)

    return runs


def save_embedded_file(data_uri: str, workflow_id: str) -> str:
    """
    Save a file from a data URI and return its relative path.
    Uses file content hash for the filename to avoid duplicates.
    """
    # Extract the base64 data from the data URI
    match = re.match(r"data:([^;]+);base64,(.+)", data_uri)
    if not match:
        raise ValueError("Invalid data URI format")

    mime_type, base64_data = match.groups()
    file_data = base64.b64decode(base64_data)

    # Generate hash from file content
    file_hash = hashlib.sha256(file_data).hexdigest()[:16]  # Use first 16 chars of hash

    # Determine file extension from mime type
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
        "video/mp4": ".mp4",
        "text/plain": ".txt",
        "text/csv": ".csv",
    }
    extension = ext_map.get(mime_type, "")

    # Create filename and ensure directory exists
    filename = f"{file_hash}{extension}"
    upload_dir = Path("data/run_files") / workflow_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save the file
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(file_data)

    return f"run_files/{workflow_id}/{filename}"


@router.post(
    "/{workflow_id}/resume_run/{run_id}/",
    response_model=RunResponseSchema,
    description="Resume a paused workflow run after human intervention",
)
async def resume_workflow(
    workflow_id: str,
    run_id: str,
    resume_request: ResumeRunRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RunResponseSchema:
    # Get the workflow and run
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.status != RunStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Run is not in a paused state")

    # Find the paused node by looking at the tasks
    paused_task = next((task for task in run.tasks if task.status == TaskStatus.PAUSED), None)
    if not paused_task:
        raise HTTPException(status_code=400, detail="No paused task found for this run")

    paused_node_id = paused_task.node_id

    workflow_version = fetch_workflow_version(workflow_id, workflow, db)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow_version.definition)

    # Update run status to RUNNING
    run.status = RunStatus.RUNNING
    db.commit()

    # Create a new task recorder and context
    task_recorder = TaskRecorder(db, run.id)
    context = WorkflowExecutionContext(
        workflow_id=workflow.id,
        run_id=run.id,
        parent_run_id=run.parent_run_id,
        run_type=run.run_type,
        db_session=db,
    )

    # Create executor with the existing workflow definition
    executor = WorkflowExecutor(
        workflow=workflow_definition,
        task_recorder=task_recorder,
        context=context,
    )

    # Update the outputs with the human intervention input
    if run.outputs:
        executor.outputs = {
            k: NodeFactory.create_node(
                node_name=node.title,
                node_type_name=node.node_type,
                config=node.config,
            ).output_model.model_validate(v)
            for k, v in run.outputs.items()
            for node in workflow_definition.nodes
            if node.id == k
        }

    # Update the paused node's output with resume information
    if paused_node_id and paused_node_id in executor.outputs:
        node_output = executor.outputs[paused_node_id]
        if isinstance(node_output, HumanInterventionNodeOutput):
            # Create new output with updated data
            updated_output = HumanInterventionNodeOutput(
                data=resume_request.inputs or {}
            )
            executor.outputs[paused_node_id] = updated_output

    # Resume execution from the paused node
    async def resume_workflow_task():
        try:
            # Convert outputs to dict format for precomputed_outputs
            precomputed: Dict[str, Union[Dict[str, Any], List[Dict[str, Any]]]] = {}
            for k, v in executor.outputs.items():
                if v is not None:
                    try:
                        precomputed[k] = v.model_dump()
                    except Exception:
                        continue

            outputs = await executor.run(
                input={},  # Input already provided in initial run
                node_ids=[n.id for n in workflow_definition.nodes],  # Run all remaining nodes
                precomputed_outputs=precomputed,  # Use existing outputs
            )
            run.outputs = {k: v.model_dump() for k, v in outputs.items()}
            run.status = RunStatus.COMPLETED
            run.end_time = datetime.now(timezone.utc)
        except Exception as e:
            run.status = RunStatus.FAILED
            run.end_time = datetime.now(timezone.utc)
            print(f"Error resuming workflow: {e}")
        db.commit()

    background_tasks.add_task(resume_workflow_task)
    return run


@router.get(
    "/paused/",
    response_model=List[PausedWorkflowResponseSchema],
    description="List all paused workflows",
)
async def list_paused_workflows(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[PausedWorkflowResponseSchema]:
    # Get paused runs with pagination
    paused_runs = (
        db.query(RunModel)
        .filter(RunModel.status == RunStatus.PAUSED)
        .order_by(desc(RunModel.start_time))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Build response with workflow definitions
    result: List[PausedWorkflowResponseSchema] = []
    for run in paused_runs:
        workflow = db.query(WorkflowModel).filter(WorkflowModel.id == run.workflow_id).first()
        if not workflow:
            continue

        workflow_version = fetch_workflow_version(run.workflow_id, workflow, db)
        workflow_definition = WorkflowDefinitionSchema.model_validate(workflow_version.definition)

        # Find the paused node by looking at the tasks
        paused_task = next((task for task in run.tasks if task.status == TaskStatus.PAUSED), None)
        if not paused_task:
            continue

        paused_node_id = paused_task.node_id

        # Get the current pause information from the node output
        current_pause = None
        if run.outputs and paused_node_id:
            node_output = run.outputs.get(paused_node_id)
            if node_output:
                current_pause = PauseHistoryResponseSchema(
                    id=f"PH_{run.id}_{paused_node_id}",  # Generate a synthetic ID
                    run_id=run.id,
                    node_id=paused_node_id,
                    pause_message=node_output.get("message", "Human intervention required"),
                    pause_time=datetime.fromisoformat(node_output.get("pause_time", datetime.now().isoformat())),
                    resume_time=None,
                    resume_user_id=None,
                    resume_action=None,
                    input_data=node_output.get("data", {}),
                    comments=None,
                )

        if current_pause:
            result.append(
                PausedWorkflowResponseSchema(
                    run=RunResponseSchema.model_validate(run),
                    current_pause=current_pause,
                    workflow=workflow_definition,
                )
            )

    return result
