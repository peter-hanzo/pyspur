from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from ..schemas.workflow_schemas import WorkflowResponseSchema
from ..models.run_model import RunStatus


class StartRunRequestSchema(BaseModel):
    initial_inputs: Optional[Dict[str, Dict[str, Any]]] = None
    parent_run_id: Optional[str] = None


class RunResponseSchema(BaseModel):
    id: str
    workflow_id: str
    workflow: WorkflowResponseSchema
    status: RunStatus
    run_type: str
    outputs: Optional[Dict[str, Any]]
    output_file_id: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]

    class Config:
        from_attributes = True


class PartialRunRequestSchema(BaseModel):
    node_id: str
    rerun_predecessors: bool = False
    initial_inputs: Optional[Dict[str, Dict[str, Any]]] = None
    partial_outputs: Optional[Dict[str, Dict[str, Any]]] = None


class RunStatusResponseSchema(BaseModel):
    id: str
    status: RunStatus
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    tasks: List[Dict[str, Any]]
    outputs: Optional[Dict[str, Any]]
    output_file_id: Optional[str]


class BatchRunRequestSchema(BaseModel):
    dataset_id: str
    mini_batch_size: int = 10
