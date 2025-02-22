from typing import Any, Dict

from pydantic import BaseModel, Field

from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from ..registry import NodeRegistry


class HumanInterventionNodeConfig(BaseNodeConfig):
    """
    Configuration for a human intervention node.
    This node type pauses workflow execution until human input is provided.
    """
    message: str = Field(
        default="Human intervention required",
        description="Message to display to the user when workflow is paused"
    )
    input_schema: Dict[str, str] = Field(
        default_factory=dict,
        description="Schema for the expected human input"
    )
    output_schema: Dict[str, str] = Field(
        default_factory=dict,
        description="Schema for the node's output after human input"
    )


class HumanInterventionNodeInput(BaseNodeInput):
    """Input model for the human intervention node."""
    class Config:
        extra = "allow"


class HumanInterventionNodeOutput(BaseNodeOutput):
    """
    Output model for the human intervention node.
    The output fields are dynamically set based on the output_schema in the config.
    """
    data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dynamic output fields based on output_schema"
    )

    class Config:
        json_schema_extra = {
            "title": "Human Intervention Output",
            "description": "Dynamic output fields based on output_schema"
        }


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

    async def run(self, input: BaseModel) -> HumanInterventionNodeOutput:
        """
        This node doesn't actually run - it's handled specially by the workflow executor
        to pause execution. When execution resumes, the human-provided input is used
        as the output.
        """
        # The actual pause/resume logic is handled by the workflow executor
        # This method should never be called directly
        raise NotImplementedError(
            "HumanInterventionNode.run() should never be called directly. "
            "The node is handled specially by the workflow executor."
        )