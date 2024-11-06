from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..schemas.run_schemas import RunStatusResponseSchema
from ..database import get_db
from ..models.run_model import RunModel, RunStatus
from ..models.output_file_model import OutputFileModel

router = APIRouter()


@router.get("/{run_id}/status/", response_model=RunStatusResponseSchema)
def get_run_status(run_id: str, db: Session = Depends(get_db)):
    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    output_file_id = None
    if run.status == RunStatus.COMPLETED:
        # find output file id
        output_file = (
            db.query(OutputFileModel).filter(OutputFileModel.run_id == run.id).first()
        )
        if output_file:
            output_file_id = output_file.id
    tasks = run.tasks
    tasks_meta = [
        {
            "node_id": task.node_id,
            "status": task.status,
            "inputs": task.inputs,
            "outputs": task.outputs,
            "run_time": task.run_time,
        }
        for task in tasks
    ]
    combined_task_outputs: Dict[str, Any] = {}
    for task in tasks:
        combined_task_outputs[task.node_id] = task.outputs
    return RunStatusResponseSchema(
        id=run.id,
        status=run.status,
        start_time=run.start_time,
        end_time=run.end_time,
        outputs=combined_task_outputs,
        tasks=tasks_meta,
        output_file_id=output_file_id,
    )
