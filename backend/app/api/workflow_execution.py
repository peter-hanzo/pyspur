from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any

from ..schemas.run import (
    RunResponseSchema,
    PartialRunRequestSchema,
    RunStatusResponseSchema,
)
from ..schemas.workflow import WorkflowDefinitionSchema
from ..models.base import get_db
from ..models.workflow import WorkflowModel as WorkflowModel
from ..models.run import RunModel as RunModel, RunStatus
from ..execution.workflow_executor import WorkflowExecutor

router = APIRouter()


@router.post("/workflows/{workflow_id}/run_blocking/", response_model=Dict[str, Any])
async def run_workflow_blocking(
    workflow_id: str, initial_inputs: Dict[str, Any] = {}, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    new_run = RunModel(
        workflow_id=workflow.id,
        status=RunStatus.RUNNING,
        initial_inputs=initial_inputs,
        start_time=datetime.now(timezone.utc),
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    workflow_definition = WorkflowDefinitionSchema.model_validate(workflow.definition)
    executor = WorkflowExecutor(workflow_definition)
    outputs = await executor(initial_inputs)
    new_run.status = RunStatus.COMPLETED
    new_run.end_time = datetime.now(timezone.utc)
    new_run.outputs = outputs
    db.commit()
    return outputs


@router.post("/workflows/{workflow_id}/run/", response_model=RunResponseSchema)
def run_workflow_non_blocking(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    initial_inputs: Dict[str, Dict[str, Any]] = {},
    db: Session = Depends(get_db),
) -> RunResponseSchema:
    workflow = (
        db.query(WorkflowModel).filter(WorkflowModel.prefid == workflow_id).first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    new_run = RunModel(
        workflow_id=workflow.id,
        status=RunStatus.PENDING,
        initial_inputs=initial_inputs,
        start_time=datetime.now(timezone.utc),
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
            run.outputs = outputs
            run.status = RunStatus.COMPLETED
            run.end_time = datetime.now(timezone.utc)
        except:
            run.status = RunStatus.FAILED
            run.end_time = datetime.now(timezone.utc)
        session.commit()
        session.close()

    background_tasks.add_task(run_workflow_task, new_run.id, db)

    return RunResponseSchema(
        id=new_run.id,
        workflow_id=workflow.id,
        status=new_run.status,
        start_time=new_run.start_time,
        end_time=new_run.end_time,
    )


@router.post("/workflows/{workflow_id}/run_partial/", response_model=Dict[str, Any])
async def run_partial_workflow(
    workflow_id: str, request: PartialRunRequestSchema, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    workflow = (
        db.query(WorkflowModel).filter(WorkflowModel.prefid == workflow_id).first()
    )
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


@router.get("/runs/{run_id}/status/", response_model=RunStatusResponseSchema)
def get_run_status(run_id: str, db: Session = Depends(get_db)):
    run = db.query(RunModel).filter(RunModel.prefid == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunStatusResponseSchema(
        id=run.id,
        status=run.status,
        start_time=run.start_time,
        end_time=run.end_time,
        outputs=run.outputs,
        output_file_id=run.output_file_id,
    )
