from typing import Dict
from pydantic import BaseModel, create_model
from .base import BaseNode


class InputValueNodeConfig(BaseModel):
    input_schema: Dict[str, str]  # Mapping of field names to type annotations


class InputValueNode(BaseNode):
    """
    Node type for accepting input values.
    """

    name = "input_value_node"
    config_model = InputValueNodeConfig

    def setup(self) -> None:
        self.input_model = create_model(
            "InputValueNodeInput",
            **self.config.input_schema,
            __base__=BaseModel,
        )
        self.output_model = self.input_model

    async def run(self, input_data: BaseModel) -> BaseModel:
        return input_data
