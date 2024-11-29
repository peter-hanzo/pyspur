from pydantic import BaseModel, Field
import json
from typing import Literal

from ...dynamic_schema import (
    DynamicInputFixedOutputNode,
    DynamicInputFixedOutputNodeConfig,
)


class PickOneNodeConfig(DynamicInputFixedOutputNodeConfig):
    based_on_key: str = Field(
        "some_key", description="Key to use for picking the output JSON string"
    )
    logic: Literal["max", "min"] = Field(
        "max", description="Logic to use for picking the output JSON string"
    )


class PickOneNodeInput(BaseModel):
    pass


class PickOneNodeOutput(BaseModel):
    picked_json_string: str
    picked_input_key: str


class PickOneNode(DynamicInputFixedOutputNode):
    """
    Node that takes multiple JSON string inputs and selects one based on the specified logic
    (max or min) for a specified key.
    """

    name = "pick_one_node"
    config_model = PickOneNodeConfig
    input_model = PickOneNodeInput
    output_model = PickOneNodeOutput
    fixed_output_schema = {"picked_json_string": "str", "picked_input_key": "str"}

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Convert input data to dictionary
        input_data_dict = input_data.model_dump()

        selected_value = None
        picked_json_string = None
        input_key = None

        for key, json_string in input_data_dict.items():
            try:
                # Parse the JSON string to a dictionary
                data = json.loads(json_string)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON string in {self.name}: {e}")

            # Get the value for the specified key
            value = data.get(self.config.based_on_key)

            if value is None:
                # Skip this JSON string if the key is not present
                continue

            # Determine if the current value should be selected based on the logic
            if (
                selected_value is None
                or (self.config.logic == "max" and value > selected_value)
                or (self.config.logic == "min" and value < selected_value)
            ):
                selected_value = value
                picked_json_string = json_string
                input_key = key

        if picked_json_string is None:
            raise ValueError(f"No valid JSON string found with key '{self.config.key}'")

        # Return the picked JSON string and the input key wrapped in the output model
        return self.output_model(
            picked_json_string=picked_json_string, picked_input_key=input_key
        )
