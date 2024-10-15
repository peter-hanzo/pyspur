from typing import Any, Dict
from pydantic import BaseModel
from .base import BaseNode


class ConstantValueNodeConfig(BaseModel):
    values: Dict[str, Any]


class ConstantValueNodeInput(BaseModel):
    pass


class ConstantValueNodeOutput(BaseModel):
    values: Dict[str, Any]


class ConstantValueNode(
    BaseNode[ConstantValueNodeConfig, ConstantValueNodeInput, ConstantValueNodeOutput]
):
    """
    Node type for producing constant values declared in the config.
    """

    name = "constant_value_node"

    def __init__(self, config: ConstantValueNodeConfig) -> None:
        self.config = config

    async def __call__(
        self, input_data: ConstantValueNodeInput
    ) -> ConstantValueNodeOutput:
        return ConstantValueNodeOutput(values=self.config.values)
