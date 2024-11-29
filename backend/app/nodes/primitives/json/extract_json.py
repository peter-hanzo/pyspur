from typing import Dict
from pydantic import BaseModel, Field
import json

from ...dynamic_schema import (
    FixedInputDynamicOutputNode,
    FixedInputDynamicOutputNodeConfig,
)


class ExtractJsonNodeConfig(FixedInputDynamicOutputNodeConfig):
    output_schema: Dict[str, str] = Field(
        {"output_field_1": "str"}, description="Schema for the extracted data"
    )


class ExtractJsonNodeInput(BaseModel):
    json_string: str


class ExtractJsonNodeOutput(BaseModel):
    pass


class ExtractJsonNode(FixedInputDynamicOutputNode):
    """
    Node that takes a JSON string input and outputs the structured data representation of the JSON
    based on a user-defined output schema.
    """

    name = "extract_json_node"
    config_model = ExtractJsonNodeConfig
    input_model = ExtractJsonNodeInput
    output_model = ExtractJsonNodeOutput
    fixed_input_schema = {"json_string": "str"}

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Extract the JSON string from the input data
        json_string = input_data.model_dump()["json_string"]

        try:
            # Parse the JSON string to a dictionary
            extracted_data = json.loads(json_string)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON string in {self.name}: {e}")

        # Filter the extracted data based on the output schema
        filtered_data = {
            key: extracted_data.get(key, "") for key in self.config.output_schema
        }

        # Return the filtered data wrapped in the output model
        return self.output_model.model_validate(filtered_data)
