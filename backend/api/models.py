import asyncio
from typing import List, Dict, Optional, Set, Any
from pydantic import BaseModel, field_validator
from node_types.base import BaseNodeType
from node_types import node_type_registry


class Node(BaseModel):
    """
    A node represents a single step in a workflow.
    """

    id: str  # ID in the workflow
    type: str  # Name of the node type
    config: BaseModel
    position: Dict[str, int]
    output: Optional[BaseModel] = None

    @field_validator("type")
    def type_must_be_in_node_registry(cls, v):
        if v not in node_type_registry:
            raise ValueError(f"Node type '{v}' is not registered")
        return v

    @property
    def node_instance(self) -> Optional[BaseNodeType]:
        if not hasattr(self, "_node_instance"):
            self._node_instance = node_type_registry[self.type](self.config)
        return self._node_instance

    async def __call__(self, input_data: BaseModel) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        node_instance = self.node_instance
        if node_instance is None:
            raise ValueError("Node instance not found")
        self.output = await node_instance(input_data)
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
        source_output_schema = node_type_registry[source_node.type].OutputType
        target_input_schema = node_type_registry[target_node.type].InputType
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

        # Step 1: Build mappings and initialize variables
        self.node_dict = self._build_node_dict()
        self.dependencies = self._build_dependencies()
        self.initial_inputs = initial_inputs
        self.node_tasks = {}

        # Step 2: Start tasks for all nodes
        for node_id in self.node_dict:
            self._get_node_task(node_id)

        # Step 3: Wait for all tasks to complete
        await asyncio.gather(*self.node_tasks.values())

        # Step 4: Collect and return outputs
        outputs = {node_id: node.output for node_id, node in self.node_dict.items()}
        outputs = {k: v for k, v in outputs.items() if v is not None}
        return outputs

    def _build_node_dict(self) -> Dict[str, Node]:
        """
        Build a mapping from node IDs to Node objects.

        Returns:
            Dict[str, Node]: Mapping of node IDs to Node instances.
        """
        return {node.id: node for node in self.nodes}

    def _build_dependencies(self) -> Dict[str, Set[str]]:
        """
        Build a mapping of node dependencies based on the links.

        Returns:
            Dict[str, Set[str]]: Mapping from node ID to a set of node IDs it depends on.
        """
        dependencies: Dict[str, Set[str]] = {node.id: set() for node in self.nodes}
        for link in self.links:
            dependencies[link.target_id].add(link.source_id)
        return dependencies

    def _get_node_task(self, node_id: str) -> asyncio.Task:
        """
        Get or create the asyncio task for the node with the given ID.

        Args:
            node_id (str): The ID of the node.

        Returns:
            asyncio.Task: The asyncio task associated with the node.
        """
        if node_id in self.node_tasks:
            return self.node_tasks[node_id]

        # Create a new task for the node execution
        task = asyncio.create_task(self._execute_node(node_id))
        self.node_tasks[node_id] = task
        return task

    async def _execute_node(self, node_id: str):
        """
        Asynchronously execute the node with the given ID.

        Args:
            node_id (str): The ID of the node to execute.
        """
        node = self.node_dict[node_id]

        # Wait for all dependencies to complete
        dependency_ids = self.dependencies.get(node_id, set())
        if dependency_ids:
            await asyncio.gather(
                *(self._get_node_task(dep_id) for dep_id in dependency_ids)
            )

        # Prepare input data for this node
        input_data_dict = self._prepare_node_input(node_id)

        # Create input data object using the node's input schema
        input_schema = node_type_registry[node.type].InputType
        node_input_data = input_schema(**input_data_dict)

        # Execute the node and store the output
        await node(node_input_data)

    def _prepare_node_input(self, node_id: str) -> Dict[str, Any]:
        """
        Prepare the input data for the node based on its dependencies and initial inputs.

        Args:
            node_id (str): The ID of the node.

        Returns:
            Dict[str, Any]: The input data for the node.
        """
        input_data = {}

        # Collect inputs from linked source nodes
        for link in self.links:
            if link.target_id == node_id:
                source_node = self.node_dict[link.source_id]
                if source_node.output is None:
                    raise ValueError(
                        f"Node '{link.source_id}' has not produced an output yet."
                    )
                source_value = getattr(source_node.output, link.source_output_key)
                input_data[link.target_input_key] = source_value

        # Include initial inputs if available
        if node_id in self.initial_inputs:
            input_data.update(self.initial_inputs[node_id])

        return input_data
