from typing import Any, Dict, Optional
from pydantic import BaseModel
from ..nodes.base import BaseNode
from ..nodes import node_registry
from ..schemas.workflow import WorkflowNode


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
        node_config = node_type_cls.config_model.model_validate(
            self.workflow_node.config
        )
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
            input_data = self.node_instance.input_model.model_validate(input_data)
        self.output = await self.node_instance(input_data)
        return self.output
