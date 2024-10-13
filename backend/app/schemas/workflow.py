from typing import List, Dict, Any
from pydantic import BaseModel, field_validator
from ..nodes import node_registry


class WorkflowNode(BaseModel):
    """
    A node represents a single step in a workflow.
    """

    id: str  # ID in the workflow
    type: str  # Name of the node type
    config: Dict[str, Any] = {}  # Configuration parameters

    @field_validator("type")
    def type_must_be_in_node_registry(cls, v):
        if v not in node_registry:
            raise ValueError(f"Node type '{v}' is not registered")
        return v


class WorkflowLink(BaseModel):
    """
    A link connects an output key of a source node to an input key of a target node.
    """

    source_id: str
    source_output_key: str
    target_id: str
    target_input_key: str


class Workflow(BaseModel):
    """
    A workflow is a DAG of nodes.
    """

    nodes: List[WorkflowNode]
    links: List[WorkflowLink]
