from typing import Any, Dict
from pydantic import BaseModel, create_model
from .base import BaseNode


class ConstantValueNodeConfig(BaseModel):
    values: Dict[str, Any]


class ConstantValueNode(BaseNode):
    """
    Node type for producing constant values declared in the config.
    """

    name = "constant_value_node"

    def setup(self) -> None:
        self.config_model = ConstantValueNodeConfig
        self.input_model = BaseModel
        self.output_model = create_model(
            "ConstantValueNodeOutput",
            **self.config.values,
            __base__=BaseModel,
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
