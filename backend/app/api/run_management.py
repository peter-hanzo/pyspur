from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..schemas.run_schemas import RunStatusResponseSchema
from ..models.base_model import get_db
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
    return RunStatusResponseSchema(
        id=run.id,
        status=run.status,
        start_time=run.start_time,
        end_time=run.end_time,
        outputs=run.outputs,
        output_file_id=output_file_id,
    )
