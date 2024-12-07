from typing import Any, Dict
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

    input_output_map: Dict[str, str] = Field(
        default={},
        title="Input Output Map",
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

    def get_nested_field(self, field_name_with_dots: str, model: BaseModel) -> Any:
        """
        Get the value of a nested field from a Pydantic model.
        """
        field_names = field_name_with_dots.split(".")
        value = model
        for field_name in field_names:
            value = getattr(value, field_name)
        return value

    async def run(self, input: BaseModel) -> BaseModel:
        output = {}
        if self.config.input_output_map:
            for input_key, output_key in self.config.input_output_map.items():
                # input_key is the field name with dot notation to access nested fields
                output[output_key] = self.get_nested_field(input_key, input)
        else:
            output = input.model_dump()
        return self.output_model(**output)
