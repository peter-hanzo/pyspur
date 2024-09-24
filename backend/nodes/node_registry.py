from typing import Type, Dict, Any
from pydantic import BaseModel

class NodeRegistry:
    def __init__(self):
        self._registry = {}

    def register(self, name: str, node_class: Type, input_schema: Type[BaseModel], output_schema: Type[BaseModel], config_schema: Type[BaseModel]):
        self._registry[name] = {
            "node_class": node_class,
            "input_schema": input_schema,
            "output_schema": output_schema,
            "config_schema": config_schema
        }

    def get_nodes(self) -> Dict[str, Dict[str, Any]]:
        return self._registry

node_registry = NodeRegistry()