from typing import Dict
from pydantic import BaseModel, Field
from ..base import (
    BaseNode,
    BaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)


class OutputNodeConfig(BaseNodeConfig):
    """
    Configuration for the OutputNode.
    """

    input_rename_map: Dict[str, str] = Field(
        default={},
        title="Input Rename Map",
        description="A dictionary mapping input field names to output field names.",
    )


class OutputNodeInput(BaseNodeInput):
    pass


class OutputNodeOutput(BaseNodeOutput):
    pass


class OutputNode(BaseNode):
    """
    Node for defining output schema and using the input from other nodes.
    """

    name = "output_node"
    config_model = OutputNodeConfig
    input_model = OutputNodeInput
    output_model = OutputNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        output = {}
        if self.config.input_rename_map:
            for key, value in self.config.input_rename_map.items():
                output[value] = getattr(input, key)
        return self.output_model.model_validate(**output)  # type: ignore
