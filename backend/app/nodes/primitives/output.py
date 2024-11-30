from typing import Dict
from pydantic import BaseModel, model_validator
from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class OutputNodeConfig(DynamicSchemaNodeConfig):
    @model_validator(mode="before")
    def set_input_schema_same_as_output(cls, data: Dict[str, str]) -> Dict[str, str]:
        data["input_schema"] = data["output_schema"]
        return data


class OutputNodeInput(BaseModel):
    pass


class OutputNodeOutput(BaseModel):
    pass


class OutputNode(DynamicSchemaNode):
    """
    Node for defining output schema and using the input from other nodes.
    """

    name = "output_node"
    config_model = OutputNodeConfig
    input_model = OutputNodeInput
    output_model = OutputNodeOutput

    async def run(self, input_data: BaseModel) -> BaseModel:
        return input_data
