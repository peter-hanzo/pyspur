from datetime import datetime
from typing import Any, Dict, Optional
from enum import Enum as PyEnum

from pydantic import BaseModel, Field

from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from ..registry import NodeRegistry


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
    Output model for the human intervention node including pause/resume information.
    """
    data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dynamic output fields based on output_schema"
    )
    pause_time: datetime = Field(
        default_factory=lambda: datetime.now(),
        description="Time when the workflow was paused"
    )
    pause_message: str = Field(
        default="Human intervention required",
        description="Message displayed to the user"
    )
    resume_time: Optional[datetime] = Field(
        default=None,
        description="Time when the workflow was resumed"
    )
    resume_user_id: Optional[str] = Field(
        default=None,
        description="ID of the user who resumed the workflow"
    )
    resume_action: Optional[PauseAction] = Field(
        default=None,
        description="Action taken to resume the workflow"
    )
    comments: Optional[str] = Field(
        default=None,
        description="Comments provided during resume"
    )

    class Config:
        json_schema_extra = {
            "title": "Human Intervention Output",
            "description": "Output including pause/resume information"
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
        Creates initial output with pause information.
        The workflow executor will handle the actual pause/resume logic.
        """
        return HumanInterventionNodeOutput(
            pause_message=self.config.message,
            data={}  # Will be populated with human input on resume
        )