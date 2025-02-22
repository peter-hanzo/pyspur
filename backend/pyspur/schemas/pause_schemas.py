from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel

from ..models.pause_model import PauseAction
from .run_schemas import RunResponseSchema
from .workflow_schemas import WorkflowDefinitionSchema


class PauseHistoryResponseSchema(BaseModel):
    id: str
    run_id: str
    node_id: str
    pause_message: Optional[str]
    pause_time: datetime
    resume_time: Optional[datetime]
    resume_user_id: Optional[str]
    resume_action: Optional[PauseAction]
    input_data: Optional[Dict[str, Any]]
    comments: Optional[str]

    class Config:
        from_attributes = True


class PausedWorkflowResponseSchema(BaseModel):
    run: RunResponseSchema
    current_pause: PauseHistoryResponseSchema
    workflow: WorkflowDefinitionSchema

    class Config:
        from_attributes = True


class ResumeActionRequestSchema(BaseModel):
    action: PauseAction
    input_data: Optional[Dict[str, Any]] = None
    comments: Optional[str] = None
    user_id: str