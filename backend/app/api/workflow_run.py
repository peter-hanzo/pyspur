import asyncio
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Awaitable, Dict, Any, List

from ..schemas.run_schemas import (
    StartRunRequestSchema,
    RunResponseSchema,
    PartialRunRequestSchema,
    BatchRunRequestSchema,
)
from ..schemas.workflow_schemas import WorkflowDefinitionSchema
from ..database import get_db
from ..models.workflow_model import WorkflowModel as WorkflowModel
from ..models.run_model import RunModel as RunModel, RunStatus
from ..models.dataset_model import DatasetModel
from ..execution.workflow_executor import WorkflowExecutor
from ..dataset.ds_util import get_ds_iterator

router = APIRouter()


@router.post(
    "/{workflow_id}/run/",
    response_model=Dict[str, Any],
    description="Run a workflow and return the outputs",
)
async def run_workflow_blocking(
    workflow_id: str, request: StartRunRequestSchema, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    initial_inputs = request.initial_inputs or {}
    new_run = RunModel(
        workflow_id=workflow.id,
        status=RunStatus.RUNNING,
        initial_inputs=initial_inputs,
        start_time=datetime.now(timezone.utc),
        run_type="interactive",
        parent_run_id=request.parent_run_id,
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow.definition)
    executor = WorkflowExecutor(workflow_definition)
    outputs = await executor(initial_inputs)
    new_run.status = RunStatus.COMPLETED
    new_run.end_time = datetime.now(timezone.utc)
    new_run.outputs = {k: v.model_dump() for k, v in outputs.items()}
    db.commit()
    return outputs


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
    initial_inputs = start_run_request.initial_inputs or {}
    new_run = RunModel(
        workflow_id=workflow.id,
        status=RunStatus.PENDING,
        initial_inputs=initial_inputs,
        start_time=datetime.now(timezone.utc),
        parent_run_id=start_run_request.parent_run_id,
        run_type=run_type,
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    async def run_workflow_task(run_id: str, session: Session):
        run = session.query(RunModel).filter(RunModel.id == run_id).first()
        if not run:
            session.close()
            return
        run.status = RunStatus.RUNNING
        session.commit()
        workflow_definition = WorkflowDefinitionSchema.model_validate(
            workflow.definition
        )
        executor = WorkflowExecutor(workflow_definition)
        try:
            assert run.initial_inputs
            outputs = await executor(run.initial_inputs)
            run.outputs = {k: v.model_dump() for k, v in outputs.items()}
            run.status = RunStatus.COMPLETED
            run.end_time = datetime.now(timezone.utc)
        except:
            run.status = RunStatus.FAILED
            run.end_time = datetime.now(timezone.utc)
        session.commit()
        session.close()

    background_tasks.add_task(run_workflow_task, new_run.id, db)

    return new_run


@router.post(
    "/{workflow_id}/run_partial/",
    response_model=Dict[str, Any],
    description="Run a partial workflow and return the outputs",
)
async def run_partial_workflow(
    workflow_id: str, request: PartialRunRequestSchema, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow.definition)
    executor = WorkflowExecutor(workflow_definition)
    try:
        outputs = await executor.run_partial(
            node_id=request.node_id,
            rerun_predecessors=request.rerun_predecessors,
            initial_inputs=request.initial_inputs or {},
            partial_outputs=request.partial_outputs or {},
        )
        return outputs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/workflow/{run_id}/run_batch/",
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
    dataset_id = request.dataset_id
    new_run = RunModel(
        workflow_id=workflow.id,
        status=RunStatus.PENDING,
        input_dataset_id=dataset_id,
        start_time=datetime.now(timezone.utc),
        run_type="batch",
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    # parse the dataset
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_path = dataset.file_path

    mini_batch_size = request.mini_batch_size

    async def start_mini_batch_runs(
        file_path: str,
        workflow_id: str,
        parent_run_id: str,
        background_tasks: BackgroundTasks,
        db: Session,
        mini_batch_size: int,
    ):
        ds_iter = get_ds_iterator(file_path)
        current_batch: List[Awaitable[RunResponseSchema]] = []
        for initial_inputs in ds_iter:
            single_input_run_task = run_workflow_non_blocking(
                workflow_id=workflow_id,
                start_run_request=StartRunRequestSchema(
                    initial_inputs=initial_inputs, parent_run_id=new_run.id
                ),
                background_tasks=background_tasks,
                db=db,
                run_type="batch",
            )
            current_batch.append(single_input_run_task)
            if len(current_batch) == mini_batch_size:
                await asyncio.gather(*current_batch)
                current_batch = []

        if current_batch:
            await asyncio.gather(*current_batch)

    background_tasks.add_task(
        start_mini_batch_runs,
        file_path,
        workflow.id,
        new_run.id,
        background_tasks,
        db,
        mini_batch_size,
    )

    return new_run


@router.get(
    "/{workflow_id}/runs/",
    response_model=List[RunResponseSchema],
    description="List all runs of a workflow",
)
def list_runs(workflow_id: str, db: Session = Depends(get_db)):
    runs = (
        db.query(RunModel)
        .filter(RunModel.workflow_id == workflow_id)
        .order_by(RunModel.start_time.desc())
        .all()
    )
    return runs
