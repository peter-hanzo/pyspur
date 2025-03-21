from enum import Enum as PyEnum
from typing import Optional

from pydantic import BaseModel, Field

from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from ..registry import NodeRegistry


class PauseError(Exception):
    """Raised when a workflow execution needs to pause for human intervention."""

    def __init__(
        self,
        node_id: str,
        message: str = "Human intervention required",
        output: Optional[BaseNodeOutput] = None,
    ):
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
    message: str = Field(
        default="Human intervention required",
        description="Message to display to the user when workflow is paused",
    )
    block_only_dependent_nodes: bool = Field(
        default=True,
        description=(
            "If True, only nodes that depend on this node's output will be blocked."
            " If False, all downstream nodes will be blocked."
        ),
    )


class HumanInterventionNodeInput(BaseNodeInput):
    """Input model for the human intervention node."""

    class Config:
        extra = "allow"


class HumanInterventionNodeOutput(BaseNodeOutput):
    class Config:
        extra = "allow"  # Allow extra fields from the input to pass through


@NodeRegistry.register(
    category="Logic",
    display_name="HumanIntervention",
    # logo="/images/human_intervention.png",
    position="after:RouterNode",
)
class HumanInterventionNode(BaseNode):
    """A node that pauses workflow execution and waits for human input.

    When this node is executed, it pauses the workflow until human intervention
    occurs. All input data is passed through to the output after approval.
    """

    name = "human_intervention_node"
    config_model = HumanInterventionNodeConfig
    input_model = HumanInterventionNodeInput
    output_model = HumanInterventionNodeOutput

    def setup(self) -> None:
        """Human intervention node setup."""
        super().setup()

    @property
    def node_id(self) -> str:
        # Return the node id from the instance dict if available, otherwise fallback to self.name
        return str(self.__dict__.get("id", self.name))

    async def run(self, input: BaseModel) -> BaseNodeOutput:
        """Process input and pause the workflow execution.

        preserving the nested structure so that downstream nodes can access
        outputs as {{HumanInterventionNode_1.input_node.input_1}}.
        """
        # Pass through the input data to preserve the nested structure
        output_dict = input.model_dump()
        output = HumanInterventionNodeOutput(**output_dict)
        raise PauseError(str(self.node_id), self.config.message, output)
