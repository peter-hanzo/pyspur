from typing import Dict
from pydantic import BaseModel, model_validator
from ..base import (
    BaseNode,
    BaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)


class InputNodeConfig(BaseNodeConfig):
    """
    Configuration for the InputNode.
    """

    input_schema: Dict[str, str] = {"input_1": "str"}

    @model_validator(mode="before")
    def set_output_schema_same_as_input(cls, data: Dict[str, str]) -> Dict[str, str]:
        data["output_schema"] = data["input_schema"]
        return data


class InputNodeInput(BaseNodeInput):
    pass


class InputNodeOutput(BaseNodeOutput):
    pass


class InputNode(BaseNode):
    """
    Node for defining dataset schema and using the output as input for other nodes.
    """

    name = "input_node"
    config_model = InputNodeConfig
    input_model = InputNodeInput
    output_model = InputNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        return input
