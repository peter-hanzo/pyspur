from typing import Dict
from pydantic import BaseModel
import json

from ...dynamic_schema import (
    DynamicInputFixedOutputNode,
    DynamicInputFixedOutputNodeConfig,
)


class JsonifyNodeConfig(DynamicInputFixedOutputNodeConfig):
    input_schema: Dict[str, str] = {"input_field_1": "str"}


class JsonifyNodeInput(BaseModel):
    pass


class JsonifyNodeOutput(BaseModel):
    json_string: str


class JsonifyNode(DynamicInputFixedOutputNode):
    """
    Node that takes structured input and outputs a JSON string representation of the input.
    """

    name = "jsonify_node"
    config_model = JsonifyNodeConfig
    input_model = JsonifyNodeInput
    output_model = JsonifyNodeOutput
    fixed_output_schema = {"json_string": "str"}

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Convert input data to dictionary
        input_data_dict = input_data.model_dump()

        # Convert the input dictionary to a JSON string
        json_string = json.dumps(input_data_dict)

        # Return the JSON string wrapped in the output model
        return self.output_model(json_string=json_string)
