from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from .workflow_schemas import WorkflowVersionResponseSchema
from ..models.run_model import RunStatus
from .task_schemas import TaskResponseSchema


class StartRunRequestSchema(BaseModel):
    initial_inputs: Optional[Dict[str, Dict[str, Any]]] = None
    parent_run_id: Optional[str] = None


class RunResponseSchema(BaseModel):
    id: str
    workflow_id: str
    workflow_version_id: int
    workflow_version: WorkflowVersionResponseSchema
    status: RunStatus
    run_type: str
    initial_inputs: Optional[Dict[str, Dict[str, Any]]]
    input_dataset_id: Optional[str]
    outputs: Optional[Dict[str, Any]]
    output_file_id: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    tasks: List[TaskResponseSchema]

    class Config:
        from_attributes = True


class PartialRunRequestSchema(BaseModel):
    node_id: str
    rerun_predecessors: bool = False
    initial_inputs: Optional[Dict[str, Dict[str, Any]]] = None
    partial_outputs: Optional[Dict[str, Dict[str, Any]]] = None


class BatchRunRequestSchema(BaseModel):
    dataset_id: str
    mini_batch_size: int = 10
