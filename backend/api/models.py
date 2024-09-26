from pydantic import BaseModel, field_validator,
from typing import List, Dict, Optional
from backend.node_types.base import BaseNodeType
from node_types import node_type_registry

from pydantic import validator

class Node(BaseModel):
    """
    A node represents a single step in a workflow.
    """
    id: str
    type: str
    config: BaseModel
    position: Dict[str, int]
    node_instance: Optional[BaseNodeType] = None
    output: Optional[BaseModel] = None

    @field_validator("type")
    def type_must_be_in_node_registry(cls, v):
        if v not in node_type_registry:
            raise ValueError(f"Type '{v}' is not present in node_type_registry")
        return v
    
    async def __call__(self, input_data: BaseModel) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        if self.node_instance is None:
            self.node_instance = node_type_registry[self.type](self.config)
        return await self.node_instance(input_data)


class Link(BaseModel):
    """
    An link connects an output key of a source node to an input key of a target node.
    """
    source_id: str
    source_output_key: str
    target_id: str
    target_input_key: str

    @field_validator("source_output_key")
    def source_output_key_must_match_target_input_key(cls, v, values):
        source_node = next(node for node in values["nodes"] if node.id == values["source_id"])
        target_node = next(node for node in values["nodes"] if node.id == values["target_id"])
        source_output_type = node_type_registry[source_node.type].output_schema().schema()["properties"][v]["type"]
        target_input_type = node_type_registry[target_node.type].input_schema().schema()["properties"][values["target_input_key"]]["type"]
        if source_output_type != target_input_type:
            raise ValueError(f"Source output type '{source_output_type}' does not match target input type '{target_input_type}'")
        return v

class Workflow(BaseModel):
    """
    A workflow is a DAG of nodes.
    """
    nodes: List[Node]
    links: List[Link]
