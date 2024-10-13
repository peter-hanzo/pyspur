from typing import Type
from pydantic import BaseModel
from .base import BaseNode


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


class ExampleNode(BaseNode[ExampleNodeConfig, ExampleNodeInput, ExampleNodeOutput]):
    """
    Example node that takes a name and returns a greeting.
    """

    name = "example"

    def __init__(self, config: ExampleNodeConfig) -> None:
        self.config = config

    async def __call__(self, input_data: ExampleNodeInput) -> ExampleNodeOutput:
        return ExampleNodeOutput(greeting=f"Hello, {input_data.name}!")


if __name__ == "__main__":
    import asyncio

    example_node = ExampleNode(ExampleNodeConfig())
    output = asyncio.run(example_node(ExampleNodeInput(name="Alice")))
    print(output)
