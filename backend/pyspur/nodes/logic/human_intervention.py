from datetime import datetime
from typing import Optional, Any, Dict, List, Tuple, TypeVar, Mapping
from enum import Enum as PyEnum

from pydantic import BaseModel, Field, create_model

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
    output_json_schema: str = Field(
        default='{"type": "object", "properties": {"output": {"type": "string"}}, "required": ["output"]}',
        description="JSON schema for the node's output"
    )


class HumanInterventionNodeInput(BaseNodeInput):
    """Input model for the human intervention node."""
    class Config:
        extra = "allow"


class HumanInterventionNodeOutput(BaseNodeOutput):
    """
    Output model for the human intervention node including pause/resume information.
    """
    node_id: str = Field(
        description="ID of the node that triggered the pause"
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
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Input data that triggered the pause"
    )

    def model_dump(self, *, mode: Optional[str] = None, include: Optional[Any] = None,
                  exclude: Optional[Any] = None, by_alias: bool = False,
                  exclude_unset: bool = False, exclude_defaults: bool = False,
                  exclude_none: bool = False, **kwargs: Any) -> Dict[str, Any]:
        """Override model_dump to ensure datetime fields are serialized."""
        data = super().model_dump(mode=mode, include=include, exclude=exclude,
                                by_alias=by_alias, exclude_unset=exclude_unset,
                                exclude_defaults=exclude_defaults,
                                exclude_none=exclude_none, **kwargs)
        # Convert datetime objects to ISO format strings
        if data.get('pause_time'):
            data['pause_time'] = data['pause_time'].isoformat()
        if data.get('resume_time'):
            data['resume_time'] = data['resume_time'].isoformat()
        return data

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
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

    def setup(self) -> None:
        """
        Setup method to define output_model based on config.
        Creates a dynamic output model that includes both the pause information
        and the input fields.
        """
        super().setup()
        if self.config.output_json_schema:
            # Create a dynamic output model that includes both pause info and input fields
            output_model = create_model(
                f"{self.name}_output",
                __base__=HumanInterventionNodeOutput,
                __config__=None,
                __module__=self.__module__,
                __validators__=None,
                __cls_kwargs__=None,
            )
            self.output_model = output_model

    async def run(self, input: BaseModel) -> BaseModel:
        """
        Creates initial output with pause information.
        The workflow executor will handle the actual pause/resume logic.
        """
        # Get input data and ensure it's JSON serializable
        input_data: Dict[str, Any] = {}
        if input:
            # Get the raw input data as a dict
            raw_data = input.model_dump()

            # Process each input node's data, ensuring everything is serializable
            for key, value in raw_data.items():
                if isinstance(value, BaseModel):
                    # If it's a Pydantic model, convert to dict
                    input_data[key] = value.model_dump()
                elif isinstance(value, dict):
                    # If it's already a dict, check if it contains any models
                    serialized_dict: Dict[str, Any] = {}
                    items: List[Tuple[str, Any]] = list(value.items())
                    for k, v in items:
                        if isinstance(v, BaseModel):
                            serialized_dict[k] = v.model_dump()
                        else:
                            serialized_dict[k] = v
                    input_data[key] = serialized_dict
                else:
                    input_data[key] = value

        # Create base output with pause information
        output_data: Dict[str, Any] = {
            "node_id": self.name,  # Set the node ID
            "pause_message": self.config.message,
            "pause_time": datetime.now(),
            "resume_time": None,
            "resume_user_id": None,
            "resume_action": None,
            "comments": None,
            "data": input_data  # Store the input data
        }

        return self.output_model(**output_data)