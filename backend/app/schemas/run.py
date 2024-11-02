from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from ..models.run import RunStatus


class RunResponseSchema(BaseModel):
    id: str
    workflow_id: str
    status: RunStatus
    start_time: Optional[datetime]
    end_time: Optional[datetime]


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
    outputs: Optional[Dict[str, Any]]
    output_file_id: Optional[str]
