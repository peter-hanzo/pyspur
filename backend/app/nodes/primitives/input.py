from typing import Dict
from pydantic import BaseModel
from ..base import (
    BaseNodeInput,
    BaseNodeOutput,
    VariableOutputBaseNode,
    VariableOutputBaseNodeConfig,
)


class InputNodeConfig(VariableOutputBaseNodeConfig):
    """
    Configuration for the InputNode.
    """

    output_schema: Dict[str, str] = {"input_1": "str"}
    pass


class InputNodeInput(BaseNodeInput):
    pass


class InputNodeOutput(BaseNodeOutput):
    pass


class InputNode(VariableOutputBaseNode):
    """
    Node for defining dataset schema and using the output as input for other nodes.
    """

    name = "input_node"
    config_model = InputNodeConfig
    input_model = InputNodeInput
    output_model = InputNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        return input
