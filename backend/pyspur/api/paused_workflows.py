from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from ..models.pause_model import PauseHistoryModel
from ..models.run_model import RunModel, RunStatus
from ..models.workflow_model import WorkflowModel
from ..schemas.pause_schemas import (
    PauseHistoryResponseSchema,
    PausedWorkflowResponseSchema,
    ResumeActionRequestSchema,
)
from ..schemas.run_schemas import RunResponseSchema

def get_paused_workflows(
    db: Session,
    page: int = 1,
    page_size: int = 10,
) -> List[PausedWorkflowResponseSchema]:
    """Get all currently paused workflows."""
    # Get the latest pause entry for each run that hasn't been resumed
    paused_runs = (
        db.query(PauseHistoryModel)
        .filter(PauseHistoryModel.resume_time.is_(None))
        .join(RunModel, PauseHistoryModel.run_id == RunModel.id)
        .join(WorkflowModel, RunModel.workflow_id == WorkflowModel.id)
        .options(joinedload(PauseHistoryModel.run).joinedload(RunModel.workflow))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return [
        PausedWorkflowResponseSchema(
            run=RunResponseSchema.model_validate(pause.run),
            current_pause=PauseHistoryResponseSchema.model_validate(pause),
            workflow=pause.run.workflow,
        )
        for pause in paused_runs
    ]

def get_run_pause_history(db: Session, run_id: str) -> List[PauseHistoryResponseSchema]:
    """Get the pause history for a specific run."""
    history = (
        db.query(PauseHistoryModel)
        .filter(PauseHistoryModel.run_id == run_id)
        .order_by(PauseHistoryModel.pause_time.desc())
        .all()
    )

    if not history:
        raise HTTPException(status_code=404, detail="No pause history found for this run")

    return [PauseHistoryResponseSchema.model_validate(entry) for entry in history]

def process_pause_action(
    db: Session, run_id: str, action_request: ResumeActionRequestSchema
) -> RunResponseSchema:
    """Process an action on a paused workflow."""
    # Get the latest pause entry for this run
    current_pause = (
        db.query(PauseHistoryModel)
        .filter(
            and_(
                PauseHistoryModel.run_id == run_id,
                PauseHistoryModel.resume_time.is_(None)
            )
        )
        .first()
    )

    if not current_pause:
        raise HTTPException(status_code=404, detail="No active pause found for this run")

    # Update the pause entry with the action
    current_pause.resume_time = datetime.now(timezone.utc)
    current_pause.resume_action = action_request.action
    current_pause.resume_user_id = action_request.user_id
    current_pause.input_data = action_request.input_data
    current_pause.comments = action_request.comments

    # Get the associated run
    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Update run status based on action
    # Note: The actual run status update logic should be handled by your workflow engine
    run.status = RunStatus.RUNNING  # Use the proper enum value

    db.commit()
    db.refresh(run)

    return RunResponseSchema.model_validate(run)