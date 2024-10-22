import os
import re
import importlib
from typing import Any, List


from .base import BaseNode
from ..schemas.node_type import NodeType


class NodeFactory:
    """
    Factory for creating node instances from a configuration.
    Node type definitions are expected to be in the nodes package.

    Conventions:
    - The node class should be named <NodeTypeName>Node
    - The config model should be named <NodeTypeName>NodeConfig
    - The input model should be named <NodeTypeName>NodeInput
    - The output model should be named <NodeTypeName>NodeOutput
    - There should be only one node type class per module
    - The module name should be the snake_case version of the node type name

    Example:
    - Node type: Example
    - Node class: ExampleNode
    - Config model: ExampleNodeConfig
    - Input model: ExampleNodeInput
    - Output model: ExampleNodeOutput
    - Module name: example

    - Node type: MCTS
    - Node class: MCTSNode
    - Config model: MCTSNodeConfig
    - Input model: MCTSNodeInput
    - Output model: MCTSNodeOutput
    - Module name: llm.mcts

    """

    @staticmethod
    def get_class_name_from_module_name(module_name: str) -> str:
        """
        class name is camel case version of the module name + "Node"
        """
        return "".join([word.capitalize() for word in module_name.split("_")]) + "Node"

    @staticmethod
    def get_module_name_from_class_name(class_name: str) -> str:
        """
        module name is the snake case version of the class name
        """
        return "_".join(
            [
                word.lower()
                for word in re.findall(r"[A-Z][a-z]*", class_name.replace("Node", ""))
            ]
        )

    @staticmethod
    def get_all_node_types() -> List[NodeType]:
        """
        Returns a list of all available node types.
        """
        node_types: List[NodeType] = []

        # Get all modules in the nodes package
        package_path = os.path.dirname(__file__)
        for file in os.listdir(package_path):
            if file.endswith(".py") and file != "__init__.py":
                module_name = file[:-3]
                class_name = NodeFactory.get_class_name_from_module_name(module_name)
                try:
                    module = importlib.import_module(
                        name=f".{module_name}", package="app.nodes"
                    )
                    node_class = getattr(module, class_name)
                    node_types.append(
                        NodeType(name=node_class.__name__, module=module_name)
                    )
                except:
                    continue

        return node_types

    @staticmethod
    def create_node(node_type_name: str, config: Any) -> BaseNode:
        """
        Creates a node instance from a configuration.
        """
        all_node_types = NodeFactory.get_all_node_types()
        node_type = next(
            (
                node_type
                for node_type in all_node_types
                if node_type.name == node_type_name
            ),
            None,
        )
        if node_type is None:
            raise ValueError(f"Node type '{node_type_name}' not found")
        module_name = node_type.module
        class_name = NodeFactory.get_class_name_from_module_name(module_name)
        module = importlib.import_module(name=f".{module_name}", package="app.nodes")
        node_class = getattr(module, class_name)
        return node_class(config)


if __name__ == "__main__":
    print("NodeFactory")
    print(NodeFactory.get_all_node_types())
    from ..nodes.constant_value import ConstantValueNodeConfig

    constant_value_node_config = ConstantValueNodeConfig(values={"foo": "bar"})
    cvn = NodeFactory.create_node("ConstantValueNode", constant_value_node_config)
    import asyncio

    print(asyncio.run(cvn(constant_value_node_config)))
