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

class ExampleNode(BaseNode):
    """
    Example node that takes a name and returns a greeting.
    """
    def __init__(self, config: ExampleNodeConfig):
        super().__init__(config, ExampleNodeInput, ExampleNodeOutput)

    async def __call__(self, input_data: ExampleNodeInput) -> ExampleNodeOutput:
        return ExampleNodeOutput(greeting=f"Hello, {input_data.name}!")
    
if __name__ == "__main__":
    import asyncio
    example_node = ExampleNode(ExampleNodeConfig())
    output = asyncio.run(example_node(ExampleNodeInput(name="Alice")))
    print(output)
