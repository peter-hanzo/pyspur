from typing import Type
from pydantic import BaseModel
from .base import BaseNodeType


class ExampleNodeConfig(BaseModel):
    """
    Configuration parameters for the ExampleNode.
    """

    pass


class ExampleNodeInput(BaseModel):
    """
    Input parameters for the ExampleNode.
    """

    name: str


class ExampleNodeOutput(BaseModel):
    """
    Output parameters for the ExampleNode.
    """

    greeting: str


class ExampleNodeType(BaseNodeType):
    """
    Example node that takes a name and returns a greeting.
    """

    name = "example"
    config_schema = ExampleNodeConfig
    input_schema = ExampleNodeInput
    output_schema = ExampleNodeOutput

    async def __call__(self, input_data: ExampleNodeInput) -> ExampleNodeOutput:
        return ExampleNodeOutput(greeting=f"Hello, {input_data.name}!")


if __name__ == "__main__":
    import asyncio

    example_node = ExampleNodeType(ExampleNodeConfig())
    output = asyncio.run(example_node(ExampleNodeInput(name="Alice")))
    print(output)
