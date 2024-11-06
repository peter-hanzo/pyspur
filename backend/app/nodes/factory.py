import importlib
from typing import Any, Dict, List

from ..schemas.node_type_schemas import NodeTypeSchema
from .base import BaseNode


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

    _SUPPORTED_NODE_TYPES = {
        "primitives": [
            {
                "node_type_name": "StaticValueNode",
                "module": ".nodes.primitives.static_value",
                "class_name": "StaticValueNode",
            },
        ],
        "llm": [
            {
                "node_type_name": "StringOutputLLMNode",
                "module": ".nodes.llm.string_output_llm",
                "class_name": "StringOutputLLMNode",
            },
            {
                "node_type_name": "StructuredOutputNode",
                "module": ".nodes.llm.structured_output",
                "class_name": "StructuredOutputNode",
            },
            {
                "node_type_name": "AdvancedLLMNode",
                "module": ".nodes.llm.advanced",
                "class_name": "AdvancedNode",
            },
            {
                "node_type_name": "MCTSNode",
                "module": ".nodes.llm.mcts",
                "class_name": "MCTSNode",
            },
            {
                "node_type_name": "BestOfNNode",
                "module": ".nodes.llm.best_of_n",
                "class_name": "BestOfNNode",
            },
            {
                "node_type_name": "BranchSolveMergeNode",
                "module": ".nodes.llm.branch_solve_merge",
                "class_name": "BranchSolveMergeNode",
            },
            {
                "node_type_name": "MixtureOfAgentsNode",
                "module": ".nodes.llm.mixture_of_agents",
                "class_name": "MixtureOfAgentsNode",
            },
            {
                "node_type_name": "SampleLLMNode",
                "module": ".nodes.llm.sample_llm",
                "class_name": "SampleLLMNode",
            },
            {
                "node_type_name": "SelfConsistencyNode",
                "module": ".nodes.llm.self_consistency",
                "class_name": "SelfConsistencyNode",
            },
            {
                "node_type_name": "TreeOfThoughtsNode",
                "module": ".nodes.llm.tree_of_thoughts",
                "class_name": "TreeOfThoughtsNode",
            },
        ],
        "python": [
            {
                "node_type_name": "PythonFuncNode",
                "module": ".nodes.python.python_func",
                "class_name": "PythonFuncNode",
            },
        ],
        "subworkflow": [
            {
                "node_type_name": "SubworkflowNode",
                "module": ".nodes.subworkflow.subworkflow_node",
                "class_name": "SubworkflowNode",
            },
        ],
    }

    @staticmethod
    def get_all_node_types() -> Dict[str, List[NodeTypeSchema]]:
        """
        Returns a list of all available node types.
        """
        node_type_groups: Dict[str, List[NodeTypeSchema]] = {}
        for group_name, node_types in NodeFactory._SUPPORTED_NODE_TYPES.items():
            node_type_groups[group_name] = []
            for node_type_dict in node_types:
                node_type = NodeTypeSchema.model_validate(node_type_dict)
                node_type_groups[group_name].append(node_type)
        return node_type_groups

    @staticmethod
    def create_node(node_type_name: str, config: Any) -> BaseNode:
        """
        Creates a node instance from a configuration.
        """
        if not NodeFactory.is_valid_node_type(node_type_name):
            raise ValueError(f"Node type '{node_type_name}' is not valid.")
        node_groups = NodeFactory._SUPPORTED_NODE_TYPES
        module_name = None
        class_name = None
        for node_group in node_groups.values():
            for node_type in node_group:
                if node_type["node_type_name"] == node_type_name:
                    module_name = node_type["module"]
                    class_name = node_type["class_name"]
                    break
        if not module_name or not class_name:
            raise ValueError(f"Node type '{node_type_name}' not found.")
        module = importlib.import_module(module_name, package="app")
        node_class = getattr(module, class_name)
        return node_class(config)

    @staticmethod
    def is_valid_node_type(node_type_name: str) -> bool:
        """
        Check if a node type is valid.
        """
        for node_types in NodeFactory._SUPPORTED_NODE_TYPES.values():
            for node_type in node_types:
                if node_type["node_type_name"] == node_type_name:
                    return True
        return False


if __name__ == "__main__":
    print("NodeFactory")
    print(NodeFactory.get_all_node_types())
    from .primitives.static_value import StaticValueNodeConfig

    constant_value_node_config = StaticValueNodeConfig(values={"foo": "bar"})
    cvn = NodeFactory.create_node("ConstantValueNode", constant_value_node_config)
    import asyncio

    print(asyncio.run(cvn(constant_value_node_config)))
