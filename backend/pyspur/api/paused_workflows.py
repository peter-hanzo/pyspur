from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.run_model import RunModel, RunStatus
from ..models.task_model import TaskStatus, TaskModel
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
    # First get runs with paused tasks
    paused_task_runs = (
        db.query(TaskModel.run_id)
        .filter(TaskModel.status == TaskStatus.PAUSED)
        .distinct()
    )

    # Then get runs with running tasks
    running_task_runs = (
        db.query(TaskModel.run_id)
        .filter(TaskModel.status == TaskStatus.RUNNING)
        .distinct()
    )

    # Main query to get paused runs
    paused_runs = (
        db.query(RunModel)
        .filter(
            # Either the run is marked as paused
            (RunModel.status == RunStatus.PAUSED) |
            # Or has paused tasks but no running tasks
            (
                RunModel.id.in_(paused_task_runs.scalar_subquery()) &
                ~RunModel.id.in_(running_task_runs.scalar_subquery())
            )
        )
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

        # Find the current pause information from tasks
        current_pause = None
        if run.tasks:
            # Find the most recently paused task
            paused_tasks = [task for task in run.tasks if task.status == TaskStatus.PAUSED]
            if paused_tasks:
                # Sort by start_time descending to get the most recent pause
                paused_tasks.sort(key=lambda x: x.start_time or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
                latest_paused_task = paused_tasks[0]

                # Only create pause history if we have a start time
                if latest_paused_task.start_time:
                    current_pause = PauseHistoryResponseSchema(
                        id=f"PH_{run.id}_{latest_paused_task.node_id}",
                        run_id=run.id,
                        node_id=latest_paused_task.node_id,
                        pause_message=latest_paused_task.error or "Human intervention required",
                        pause_time=latest_paused_task.start_time,
                        resume_time=latest_paused_task.end_time,
                        resume_user_id=None,  # This would come from task metadata if needed
                        resume_action=None,  # This would come from task metadata if needed
                        input_data=latest_paused_task.inputs or {},
                        comments=None,  # This would come from task metadata if needed
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


def get_run_pause_history(db: Session, run_id: str) -> List[PauseHistoryResponseSchema]:
    """Get the pause history for a specific run."""
    run = db.query(RunModel).filter(RunModel.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Build pause history from tasks
    history: List[PauseHistoryResponseSchema] = []

    if run.tasks:
        # Get all tasks that were ever paused
        paused_tasks = [task for task in run.tasks if task.status == TaskStatus.PAUSED]
        for task in paused_tasks:
            # Skip if no start time
            if not task.start_time:
                continue
            history.append(
                PauseHistoryResponseSchema(
                    id=f"PH_{run.id}_{task.node_id}",
                    run_id=run.id,
                    node_id=task.node_id,
                    pause_message=task.error or "Human intervention required",
                    pause_time=task.start_time,
                    resume_time=task.end_time,
                    resume_user_id=None,  # This would come from task metadata if needed
                    resume_action=None,  # This would come from task metadata if needed
                    input_data=task.inputs or {},
                    comments=None,  # This would come from task metadata if needed
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
        # Check if there are any paused tasks
        has_paused_tasks = any(task.status == TaskStatus.PAUSED for task in run.tasks)
        if not has_paused_tasks:
            raise HTTPException(status_code=400, detail="Run is not in a paused state")

    # Find the paused task
    paused_task = None
    for task in run.tasks:
        if task.status == TaskStatus.PAUSED:
            paused_task = task
            break

    if not paused_task:
        raise HTTPException(status_code=400, detail="No paused task found for this run")

    # Update the task with the action
    paused_task.end_time = datetime.now(timezone.utc)
    paused_task.status = TaskStatus.RUNNING
    paused_task.error = None  # Clear any error message
    paused_task.outputs = action_request.inputs  # Store new inputs as outputs

    # Update run status to RUNNING if it was PAUSED
    if run.status == RunStatus.PAUSED:
        run.status = RunStatus.RUNNING

    db.commit()
    db.refresh(run)

    return RunResponseSchema.model_validate(run)