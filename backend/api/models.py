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
    config: Dict[str, Any] = {}  # Configuration parameters

    @field_validator("type")
    def type_must_be_in_node_registry(cls, v):
        if v not in node_type_registry:
            raise ValueError(f"Node type '{v}' is not registered")
        return v

    @property
    def node_instance(self) -> BaseNodeType:
        if not hasattr(self, "_node_instance"):
            node_type = node_type_registry.get(self.type)
            if node_type is None:
                raise ValueError(f"Node type '{self.type}' not found in registry")
            node_config = node_type.ConfigType(**self.config)
            self._node_instance = node_type_registry[self.type](node_config)
        return self._node_instance

    @property
    def output(self) -> Optional[BaseModel]:
        return getattr(self, "_output", None)

    async def __call__(self, input_data: BaseModel) -> BaseModel:
        """
        Execute the node with the given input data.
        """
        node_instance = self.node_instance
        if node_instance is None:
            raise ValueError("Node instance not found")
        self._output = await node_instance(input_data)
        return self._output


class Link(BaseModel):
    """
    A link connects an output key of a source node to an input key of a target node.
    """

    source_id: str
    source_output_key: str
    target_id: str
    target_input_key: str


class Workflow(BaseModel):
    """
    A workflow is a DAG of nodes.
    """

    nodes: List[Node]
    links: List[Link]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # self.dependencies = {}
        # self.initial_inputs = {}
        # self.node_tasks = {}
        self.validate_links()

    def are_link_types_compatible(self, link: Link) -> bool:
        """
        Check if the types of the source and target nodes are compatible.

        Args:
            link (Link): The link to check.

        Returns:
            bool: True if the types are compatible, False otherwise.
        """
        source_node = next((n for n in self.nodes if n.id == link.source_id), None)
        target_node = next((n for n in self.nodes if n.id == link.target_id), None)
        if source_node is None or target_node is None:
            return False

        source_output_type = source_node.node_instance.OutputType.model_fields.get(
            link.source_output_key
        )
        target_input_type = target_node.node_instance.InputType.model_fields.get(
            link.target_input_key
        )
        if source_output_type is None or target_input_type is None:
            return False

        return source_output_type.annotation == target_input_type.annotation

    def validate_links(self):
        """
        Validate that all links in the workflow are compatible.
        """
        for link in self.links:
            if not self.are_link_types_compatible(link):
                raise ValueError(f"Link {link} is not compatible with the node types")

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
        self._node_dict = self._build_node_dict()
        self._dependencies = self._build_dependencies()
        self._initial_inputs = initial_inputs
        self._node_tasks = {}

        # Step 2: Start tasks for all nodes
        for node_id in self._node_dict:
            self._get_node_task(node_id)

        # Step 3: Wait for all tasks to complete
        await asyncio.gather(*self._node_tasks.values())

        # Step 4: Collect and return outputs
        outputs = {node_id: node.output for node_id, node in self._node_dict.items()}
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
        if node_id in self._node_tasks:
            return self._node_tasks[node_id]

        # Create a new task for the node execution
        task = asyncio.create_task(self._execute_node(node_id))
        self._node_tasks[node_id] = task
        return task

    async def _execute_node(self, node_id: str):
        """
        Asynchronously execute the node with the given ID.

        Args:
            node_id (str): The ID of the node to execute.
        """
        node = self._node_dict[node_id]

        # Wait for all dependencies to complete
        dependency_ids = self._dependencies.get(node_id, set())
        if dependency_ids:
            await asyncio.gather(
                *(self._get_node_task(dep_id) for dep_id in dependency_ids)
            )

        # Prepare input data for this node
        input_data_dict = self._prepare_node_input(node_id)

        # Create input data object using the node's input schema
        input_schema = node.node_instance.InputType
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
                source_node = self._node_dict[link.source_id]
                if source_node.output is None:
                    raise ValueError(
                        f"Node '{link.source_id}' has not produced an output yet."
                    )
                source_value = getattr(source_node.output, link.source_output_key)
                input_data[link.target_input_key] = source_value

        # Include initial inputs if available
        if node_id in self._initial_inputs:
            input_data.update(self._initial_inputs[node_id])

        return input_data
