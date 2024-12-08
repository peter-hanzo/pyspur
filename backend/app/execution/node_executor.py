from typing import Any, Dict, Optional, List

from pydantic import BaseModel

from ..nodes.base import BaseNode
from ..nodes.factory import NodeFactory
from ..schemas.workflow_schemas import WorkflowDefinitionSchema, WorkflowNodeSchema, WorkflowLinkSchema
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
        self.active_branch: Optional[str] = None  # Track which branch was taken for conditional nodes

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

    @property
    def is_conditional(self) -> bool:
        """Check if this node is a conditional node"""
        return self.workflow_node.node_type == "conditional_node"

    def get_active_branch_links(self, links: List[WorkflowLinkSchema]) -> List[WorkflowLinkSchema]:
        """
        For conditional nodes, return only the links that correspond to the active branch.
        For non-conditional nodes, return all links.
        """
        if not self.is_conditional or not self.active_branch:
            return links

        # Filter links to only include those from the active branch output
        return [
            link for link in links
            if link.source_id == self.workflow_node.id
            and link.source_output_key == self.active_branch
        ]

    async def __call__(self, input_data: BaseModel | Dict[str, Any]) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        if isinstance(input_data, dict):
            input_data = self.node_instance.input_model.model_validate(input_data)

        self.output = await self.node_instance(input_data)
        self.subworkflow = self.node_instance.subworkflow
        self.subworkflow_output = self.node_instance.subworkflow_output

        # For conditional nodes, determine which branch was taken
        if self.is_conditional and isinstance(self.output, BaseModel):
            outputs_dict = self.output.model_dump().get("outputs", {})
            # The active branch is the one that has a value in the outputs
            self.active_branch = next((key for key, value in outputs_dict.items() if value is not None), None)

        return self.output
