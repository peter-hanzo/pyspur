import asyncio
from typing import List, Dict, Optional, Set, Any
from pydantic import BaseModel, field_validator
from backend.node_types.base import BaseNodeType
from backend.node_types import node_type_registry


class Node(BaseModel):
    """
    A node represents a single step in a workflow.
    """

    id: str  # ID in the workflow
    type: str  # Name of the node type
    config: BaseModel
    position: Dict[str, int]
    node_instance: Optional[BaseNodeType] = None
    output: Optional[BaseModel] = None

    @field_validator("type")
    def type_must_be_valid(cls, v):
        if v not in node_type_registry:
            raise ValueError(f"Node type '{v}' is not registered")
        return v

    async def __call__(self, input_data: BaseModel) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        if self.node_instance is None:
            self.node_instance = node_type_registry[self.type](self.config)
        self.output = await self.node_instance(input_data)
        return self.output


class Link(BaseModel):
    """
    A link connects an output key of a source node to an input key of a target node.
    """

    source_id: str
    source_output_key: str
    target_id: str
    target_input_key: str

    @field_validator("source_output_key")
    def source_output_key_must_match_target_input_key(cls, v, values):
        source_node = next(
            node for node in values["nodes"] if node.id == values["source_id"]
        )
        target_node = next(
            node for node in values["nodes"] if node.id == values["target_id"]
        )
        source_output_schema = node_type_registry[source_node.type].output_schema
        target_input_schema = node_type_registry[target_node.type].input_schema
        if v not in source_output_schema.model_fields:
            raise ValueError(f"Output key '{v}' not found in source node output schema")
        if values["target_input_key"] not in target_input_schema.model_fields:
            raise ValueError(
                f"Input key '{values['target_input_key']}' not found in target node input schema"
            )
        return v


class Workflow(BaseModel):
    """
    A workflow is a DAG of nodes.
    """

    nodes: List[Node]
    links: List[Link]

    async def execute(
        self, initial_inputs: Dict[str, Any] = {}
    ) -> Dict[str, BaseModel]:
        """
        Execute the workflow asynchronously.

        Args:
            initial_inputs (Dict[str, Any], optional): Inputs for nodes with no dependencies.

        Returns:
            Dict[str, BaseModel]: Outputs of all nodes after execution.
        """

        # Mapping from node ID to Node object
        node_dict: Dict[str, Node] = {node.id: node for node in self.nodes}

        # Build dependencies: for each node, a set of node IDs it depends on
        dependencies: Dict[str, Set[str]] = {node.id: set() for node in self.nodes}
        for link in self.links:
            dependencies[link.target_id].add(link.source_id)

        # Tasks for nodes
        node_tasks: Dict[str, asyncio.Task] = {}

        def get_node_task(node_id: str) -> asyncio.Task:
            if node_id in node_tasks:
                return node_tasks[node_id]
            else:
                node = node_dict[node_id]

                async def node_func():
                    # Wait for all dependencies
                    if dependencies[node_id]:
                        await asyncio.gather(
                            *(get_node_task(dep_id) for dep_id in dependencies[node_id])
                        )

                    # Prepare input data for this node
                    input_data_dict = {}
                    # Collect inputs from links
                    for link in self.links:
                        if link.target_id == node_id:
                            source_node = node_dict[link.source_id]
                            source_output = source_node.output
                            if source_output is None:
                                raise ValueError(f"Node {link.source_id} has no output")
                            input_value = getattr(source_output, link.source_output_key)
                            input_data_dict[link.target_input_key] = input_value

                    # Include initial inputs if available
                    if node_id in initial_inputs:
                        input_data_dict.update(initial_inputs[node_id])

                    # Create input data object using the node's input schema
                    input_schema = node_type_registry[node.type].input_schema
                    node_input_data = input_schema(**input_data_dict)

                    # Execute the node
                    await node(node_input_data)

                # Create and store the task
                task = asyncio.create_task(node_func())
                node_tasks[node_id] = task
                return task

        # Start tasks for all nodes
        for node_id in node_dict:
            get_node_task(node_id)

        # Wait for all tasks to complete
        await asyncio.gather(*node_tasks.values())

        # Collect outputs
        outputs = {node_id: node_dict[node_id].output for node_id in node_dict}
        outputs = {k: v for k, v in outputs.items() if v is not None}
        return outputs
