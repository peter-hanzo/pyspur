from typing import Any, Dict, Optional, List
from pydantic import BaseModel
from ..nodes.base import BaseNode
from ..nodes import node_registry
from ..schemas.workflow import WorkflowNode, WorkflowLink


class NodeExecutorDask:
    """
    Handles the execution of a workflow node using Dask.
    """

    def __init__(self, workflow_node: WorkflowNode):
        self.workflow_node = workflow_node
        self._node_instance: Optional[BaseNode] = None

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

    async def execute_with_dependencies(
        self,
        dependency_outputs: List[tuple[str, BaseModel]],
        links: List[WorkflowLink],
        node_dict: Dict[str, WorkflowNode],
        initial_input: Dict[str, Any],
    ) -> BaseModel:
        """
        Execute the node after resolving dependencies.
        """
        # Prepare input data
        input_data = initial_input.copy()

        # Map outputs from dependencies to inputs based on links
        for link in links:
            if link.target_id == self.workflow_node.id:
                for dep_id, dep_output in dependency_outputs:
                    if dep_output and dep_id == link.source_id:
                        source_value = getattr(dep_output, link.source_output_key)
                        input_data[link.target_input_key] = source_value
                        break

        # Instantiate input data
        input_schema = self.node_instance.InputType
        node_input_data = input_schema(**input_data)

        # Execute node
        output = await self(node_input_data)
        return output

    async def __call__(self, input_data: BaseModel | Dict[str, Any]) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        if isinstance(input_data, dict):
            input_data = self.node_instance.InputType(**input_data)
        if self.node_instance is None:
            raise ValueError("Node instance not found")
        return await self.node_instance(input_data)
