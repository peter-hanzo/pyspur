from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator

from ..nodes.factory import NodeFactory


class WorkflowNodeCoordinatesSchema(BaseModel):
    """
    Coordinates for a node in a workflow.
    """

    x: float
    y: float


class WorkflowNodeSchema(BaseModel):
    """
    A node represents a single step in a workflow.
    """

    id: str  # ID in the workflow
    node_type: str  # Name of the node type
    config: Dict[str, Any] = {}  # Configuration parameters
    coordinates: WorkflowNodeCoordinatesSchema  # Position of the node in the workflow

    @field_validator("node_type")
    def type_must_be_in_factory(cls, v: str):
        if not NodeFactory.is_valid_node_type(v):
            raise ValueError(f"Node type '{v}' is not valid.")
        return v


class WorkflowLinkSchema(BaseModel):
    """
    A link connects an output key of a source node to an input key of a target node.
    """

    source_id: str
    source_output_key: str
    target_id: str
    target_input_key: str


class WorkflowDefinitionSchema(BaseModel):
    """
    A workflow is a DAG of nodes.
    """

    nodes: List[WorkflowNodeSchema]
    links: List[WorkflowLinkSchema]


class WorkflowCreateRequestSchema(BaseModel):
    """
    A request to create a new workflow.
    """

    name: str
    description: str = ""
    definition: WorkflowDefinitionSchema


class WorkflowResponseSchema(BaseModel):
    """
    A response containing the details of a workflow.
    """

    id: str
    name: str
    description: Optional[str]
    definition: WorkflowDefinitionSchema
    created_at: datetime
    updated_at: datetime


class WorkflowsListResponseSchema(BaseModel):
    """
    A response containing a list of workflows.
    """

    workflows: List[WorkflowResponseSchema]
