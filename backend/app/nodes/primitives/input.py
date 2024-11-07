from typing import Dict
from pydantic import BaseModel, model_validator
from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class InputNodeConfig(DynamicSchemaNodeConfig):
    @model_validator(mode="before")
    def set_output_schema_same_as_input(cls, data: Dict[str, str]) -> Dict[str, str]:
        data["output_schema"] = data["input_schema"]
        return data


class InputNodeInput(BaseModel):
    pass


class InputNodeOutput(BaseModel):
    pass


class InputNode(DynamicSchemaNode):
    """
    Node for defining dataset schema and using the output as input for other nodes.
    """

    name = "input_node"
    config_model = InputNodeConfig
    input_model = InputNodeInput
    output_model = InputNodeOutput

    async def run(self, input_data: BaseModel) -> BaseModel:
        return input_data
