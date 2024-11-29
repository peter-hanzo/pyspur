from typing import Any, Dict, Optional

from pydantic import BaseModel

from ..nodes.base import BaseNode
from ..nodes.factory import NodeFactory
from ..schemas.workflow_schemas import WorkflowDefinitionSchema, WorkflowNodeSchema
from .workflow_execution_context import WorkflowExecutionContext


class NodeExecutor:
    """
    Handles the execution of a workflow node.
    """

    def __init__(
        self,
        workflow_node: WorkflowNodeSchema,
        context: Optional[WorkflowExecutionContext] = None,
    ):
        self.workflow_node = workflow_node
        self.context = context
        self._node_instance: Optional[BaseNode] = None
        self.output: Optional[BaseModel] = None
        self.subworkflow: Optional[WorkflowDefinitionSchema] = None
        self.subworkflow_output: Optional[Dict[str, Any]] = None

    def create_node_instance(self) -> BaseNode:
        """
        Instantiate the node type with the provided configuration.
        """
        node_type_name = self.workflow_node.node_type
        config = self.workflow_node.config
        return NodeFactory.create_node(node_type_name, config)

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
        self.subworkflow = self.node_instance.subworkflow
        self.subworkflow_output = self.node_instance.subworkflow_output
        return self.output
