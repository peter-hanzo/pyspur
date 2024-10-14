from typing import Any, Dict, Optional
from pydantic import BaseModel
from regex import D
from app.nodes.base import BaseNode
from app.nodes import node_registry
from app.schemas.workflow import WorkflowNode


class NodeExecutor:
    """
    Handles the execution of a workflow node.
    """

    def __init__(self, workflow_node: WorkflowNode):
        self.workflow_node = workflow_node
        self._node_instance: Optional[BaseNode] = None
        self.output: Optional[BaseModel] = None

    def create_node_instance(self) -> BaseNode:
        """
        Instantiate the node type with the provided configuration.
        """
        node_type_cls = node_registry.get(self.workflow_node.type)
        if node_type_cls is None:
            raise ValueError(
                f"Node type '{self.workflow_node.type}' not found in registry"
            )
        node_config = node_type_cls.ConfigType(**self.workflow_node.config)
        return node_type_cls(node_config)

    @property
    def node_instance(self) -> BaseNode:
        if self._node_instance is None:
            self._node_instance = self.create_node_instance()
        return self._node_instance

    async def __call__(self, input_data: BaseModel | Dict[str, Any]) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        if isinstance(input_data, dict):
            input_data = self.node_instance.InputType(**input_data)
        if self.node_instance is None:
            raise ValueError("Node instance not found")
        self.output = await self.node_instance(input_data)
        return self.output
