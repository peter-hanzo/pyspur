from typing import Optional, Any, Dict
from enum import Enum as PyEnum

from pydantic import BaseModel, Field

from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from ..registry import NodeRegistry

class PauseException(Exception):
    """Raised when a workflow execution needs to pause for human intervention."""
    def __init__(self, node_id: str, message: str = "Human intervention required", output: Optional[BaseNodeOutput] = None):
        self.node_id = node_id
        self.message = message
        self.output = output
        super().__init__(f"Workflow paused at node {node_id}: {message}")

class PauseAction(PyEnum):
    """Actions that can be taken on a paused workflow."""
    APPROVE = "APPROVE"
    DECLINE = "DECLINE"
    OVERRIDE = "OVERRIDE"


class HumanInterventionNodeConfig(BaseNodeConfig):
    """
    Configuration for a human intervention node.
    This node type pauses workflow execution until human input is provided.
    """
    message: str = Field(
        default="Human intervention required",
        description="Message to display to the user when workflow is paused"
    )
    output_json_schema: str = Field(
        default='{"type": "object", "properties": {"output": {"type": "string"}}, "required": ["output"]}',
        description="JSON schema for the node's output"
    )
    block_only_dependent_nodes: bool = Field(
        default=True,
        description="If True, only nodes that depend on this node's output will be blocked. If False, all downstream nodes will be blocked."
    )


class HumanInterventionNodeInput(BaseNodeInput):
    """Input model for the human intervention node."""
    class Config:
        extra = "allow"


class HumanInterventionNodeOutput(BaseNodeOutput):
    """
    Output model for the human intervention node that passes through input data.
    """
    data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Passed through input data"
    )
    class Config:
        extra = "allow"


@NodeRegistry.register(
    category="Logic",
    display_name="HumanIntervention",
    # logo="/images/human_intervention.png",
    position="after:RouterNode"
)
class HumanInterventionNode(BaseNode):
    """
    A node that pauses workflow execution and waits for human input.
    The workflow will resume once the required input is provided.
    """
    name = "human_intervention_node"
    config_model = HumanInterventionNodeConfig
    input_model = HumanInterventionNodeInput
    output_model = HumanInterventionNodeOutput

    def setup(self) -> None:
        """
        Setup method to define output_model based on config.
        For this minimal passthrough node, we simply call the base setup.
        """
        super().setup()
        # Remove dynamic output model creation to preserve the minimal output model.

    async def run(self, input: BaseModel) -> BaseModel:
        """
        Pass through the input data as output data and pause the workflow.
        """
        output_data = input.model_dump() if input else {}
        output = self.output_model(**{'data': output_data})
        # Raise PauseException to trigger workflow pause, but keep our simplified output model
        raise PauseException(self.name, self.config.message, output)