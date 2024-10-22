from typing import List, Dict, Any
from pydantic import BaseModel, field_validator
from ..nodes.factory import NodeFactory


class WorkflowNode(BaseModel):
    """
    A node represents a single step in a workflow.
    """

    id: str  # ID in the workflow
    node_type: str  # Name of the node type
    config: Dict[str, Any] = {}  # Configuration parameters

    @field_validator("node_type")
    def type_must_be_in_factory(cls, v: str):
        if not NodeFactory.is_valid_node_type(v):
            raise ValueError(f"Node type '{v}' is not valid.")
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
