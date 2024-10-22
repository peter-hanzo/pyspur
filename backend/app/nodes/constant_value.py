from typing import Any, Dict
from pydantic import BaseModel
from .base import BaseNode


class ConstantValueNodeConfig(BaseModel):
    values: Dict[str, Any]


class ConstantValueNodeInput(BaseModel):
    pass


class ConstantValueNodeOutput(BaseModel):
    pass


class ConstantValueNode(BaseNode):
    """
    Node type for producing constant values declared in the config.
    """

    name = "constant_value_node"
    config_model = ConstantValueNodeConfig
    input_model = ConstantValueNodeInput
    output_model = ConstantValueNodeOutput

    def setup(self) -> None:
        self.input_model = ConstantValueNodeInput
        self.output_model = self.get_model_for_value_dict(
            self.config.values, "ConstantValueNodeOutput"
        )

    async def run(self, input_data: BaseModel) -> BaseModel:
        return self.output_model(**self.config.values)


if __name__ == "__main__":
    import asyncio

    constant_value_node = ConstantValueNode(
        ConstantValueNodeConfig(values={"key": "value"})
    )
    output = asyncio.run(constant_value_node(BaseModel()))
    print(output)
