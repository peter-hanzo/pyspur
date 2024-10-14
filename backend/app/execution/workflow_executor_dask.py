from typing import Dict, Any, Set
from pydantic import BaseModel
from app.schemas.workflow import Workflow, WorkflowNode, WorkflowLink
from .node_executor_dask import NodeExecutorDask
from .dask_cluster_manager import DaskClusterManager


class WorkflowExecutorDask:
    """
    Handles the execution of a workflow using Dask for parallel execution.
    """

    def __init__(self, workflow: Workflow):
        self.workflow = workflow
        self._node_dict: Dict[str, WorkflowNode] = {}
        self._dependencies: Dict[str, Set[str]] = {}
        self._initial_inputs: Dict[str, Dict[str, Any]] = {}
        self._outputs: Dict[str, BaseModel] = {}
        self._futures: Dict[str, Any] = {}  # Dask futures

        self._build_node_dict()
        self._validate_links()
        self._build_dependencies()
        self._client = DaskClusterManager.get_client()

    def _validate_links(self):
        """
        Validate that all links in the workflow are compatible.
        """
        for link in self.workflow.links:
            if not self._are_link_types_compatible(link):
                raise ValueError(f"Link {link} is not compatible with the node types.")

    def _are_link_types_compatible(self, link: WorkflowLink) -> bool:
        source_node = self._node_dict.get(link.source_id)
        target_node = self._node_dict.get(link.target_id)
        if source_node is None or target_node is None:
            return False

        source_node_executor = NodeExecutorDask(source_node)
        target_node_executor = NodeExecutorDask(target_node)

        source_output_type = (
            source_node_executor.node_instance.OutputType.model_fields.get(
                link.source_output_key
            )
        )
        target_input_type = (
            target_node_executor.node_instance.InputType.model_fields.get(
                link.target_input_key
            )
        )
        if source_output_type is None or target_input_type is None:
            return False

        return source_output_type.annotation == target_input_type.annotation

    def _build_node_dict(self):
        self._node_dict = {node.id: node for node in self.workflow.nodes}

    def _build_dependencies(self):
        dependencies: Dict[str, Set[str]] = {
            node.id: set() for node in self.workflow.nodes
        }
        for link in self.workflow.links:
            dependencies[link.target_id].add(link.source_id)
        self._dependencies = dependencies

    def _submit_node(self, node_id: str):
        if node_id in self._futures:
            return self._futures[node_id]

        node_executor = NodeExecutorDask(self._node_dict[node_id])

        # Prepare dependencies
        dependency_futures = [
            (dep_id, self._submit_node(dep_id))
            for dep_id in self._dependencies.get(node_id, set())
        ]

        # Include initial inputs if available
        initial_input = self._initial_inputs.get(node_id, {})

        # Submit the node execution to Dask
        future = self._client.submit(
            node_executor.execute_with_dependencies,
            dependency_futures,
            self.workflow.links,
            self._node_dict,
            initial_input,
            pure=False,
        )
        self._futures[node_id] = future
        return future

    async def run(self, initial_inputs: Dict[str, Dict[str, Any]] = {}):
        if initial_inputs:
            self._initial_inputs = initial_inputs

        # Submit tasks for all nodes
        futures = [self._submit_node(node_id) for node_id in self._node_dict.keys()]

        # Gather results
        results = self._client.gather(futures, asynchronous=True)
        results = await results  # type: ignore
        self._outputs = dict(zip(self._node_dict.keys(), results))
        return self._outputs

    async def __call__(self, initial_inputs: Dict[str, Dict[str, Any]] = {}):
        return await self.run(initial_inputs)
