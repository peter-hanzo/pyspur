from typing import Any, Dict, TypedDict
from .base import BaseNode

class ExampleNode(BaseNode):
    """
    Example node that takes a name and returns a greeting.
    """

    def __init__(self, name: str):
        self.name = name

    def run(self) -> TypedDict("GreetingOutput", {"greeting": str}):
        return {"greeting": f"Hello, {self.name}!"}

if __name__ == "__main__":
    import asyncio
    node = ExampleNode(name="World")
    result = asyncio.run(node.run())
    print(result)