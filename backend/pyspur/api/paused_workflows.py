from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from ..models.run_model import RunModel, RunStatus
from ..models.workflow_model import WorkflowModel
from ..schemas.pause_schemas import (
    PauseHistoryResponseSchema,
    PausedWorkflowResponseSchema,
)
from ..schemas.run_schemas import (
    RunResponseSchema,
    ResumeRunRequestSchema,
)
from ..schemas.workflow_schemas import WorkflowDefinitionSchema


def get_paused_workflows(
    db: Session,
    page: int = 1,
    page_size: int = 10,
) -> List[PausedWorkflowResponseSchema]:
    """Get all currently paused workflows."""
    # Get paused runs with pagination
    paused_runs = (
        db.query(RunModel)
        .filter(RunModel.status == RunStatus.PAUSED)
        .order_by(RunModel.start_time.desc())
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

        workflow_definition = WorkflowDefinitionSchema.model_validate(workflow.definition)

        # Find the current pause information from node outputs
        current_pause = None
        if run.outputs:
            # Find the most recently paused node that hasn't been resumed
            for node_id, output in run.outputs.items():
                if isinstance(output, dict) and output.get("pause_time"):
                    if not output.get("resume_time"):  # Node hasn't been resumed
                        current_pause = PauseHistoryResponseSchema(
                            id=f"PH_{run.id}_{node_id}",
                            run_id=run.id,
                            node_id=node_id,
                            pause_message=output.get("pause_message"),
                            pause_time=datetime.fromisoformat(output.get("pause_time")),
                            resume_time=None,
                            resume_user_id=None,
                            resume_action=None,
                            input_data=output.get("data"),
                            comments=None,
                        )
                        break

        if current_pause:
            result.append(
                PausedWorkflowResponseSchema(
                    run=RunResponseSchema.model_validate(run),
                    current_pause=current_pause,
                    workflow=workflow_definition,
                )
            )

    return result


def get_run_pause_history(db: Session, run_id: str) -> List[PauseHistoryResponseSchema]:
    """Get the pause history for a specific run."""
    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if not run.outputs:
        return []

    # Build pause history from node outputs
    history: List[PauseHistoryResponseSchema] = []
    for node_id, output in run.outputs.items():
        if isinstance(output, dict) and output.get("pause_time"):
            history.append(
                PauseHistoryResponseSchema(
                    id=f"PH_{run.id}_{node_id}",
                    run_id=run.id,
                    node_id=node_id,
                    pause_message=output.get("pause_message"),
                    pause_time=datetime.fromisoformat(output.get("pause_time")),
                    resume_time=datetime.fromisoformat(output.get("resume_time")) if output.get("resume_time") else None,
                    resume_user_id=output.get("resume_user_id"),
                    resume_action=output.get("resume_action"),
                    input_data=output.get("data"),
                    comments=output.get("comments"),
                )
            )

    return sorted(history, key=lambda x: x.pause_time, reverse=True)


def process_pause_action(
    db: Session, run_id: str, action_request: ResumeRunRequestSchema
) -> RunResponseSchema:
    """Process an action on a paused workflow."""
    # Get the run
    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.status != RunStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Run is not in a paused state")

    # Find the paused node from outputs
    paused_node_id = None
    if run.outputs:
        for node_id, output in run.outputs.items():
            if isinstance(output, dict) and output.get("pause_time"):
                if not output.get("resume_time"):  # Node hasn't been resumed
                    paused_node_id = node_id
                    break

    if not paused_node_id:
        raise HTTPException(status_code=400, detail="No paused node found for this run")

    # Update the node output with the action
    node_output = run.outputs[paused_node_id]
    node_output.update({
        'resume_time': datetime.now(timezone.utc).isoformat(),
        'resume_user_id': action_request.user_id,
        'resume_action': action_request.action,
        'data': action_request.inputs,
        'comments': action_request.comments
    })
    run.outputs[paused_node_id] = node_output

    # Update run status
    run.status = RunStatus.RUNNING
    db.commit()
    db.refresh(run)

    return RunResponseSchema.model_validate(run)