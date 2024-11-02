import asyncio
from typing import Any, Awaitable, Callable, Dict, Iterator, List, Set, Tuple

from pydantic import BaseModel

from ..schemas.workflow import (
    WorkflowDefinitionSchema,
    WorkflowLinkSchema,
    WorkflowNodeSchema,
)
from .dask_cluster_manager import DaskClusterManager
from .node_executor_dask import NodeExecutorDask


class WorkflowExecutorDask:
    """
    Handles the execution of a workflow using Dask for parallel execution.
    """

    def __init__(self, workflow: WorkflowDefinitionSchema):
        self.workflow = workflow
        self._node_dict: Dict[str, WorkflowNodeSchema] = {}
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

    def _are_link_types_compatible(self, link: WorkflowLinkSchema) -> bool:
        source_node = self._node_dict.get(link.source_id)
        target_node = self._node_dict.get(link.target_id)
        if source_node is None or target_node is None:
            return False

        source_node_executor = NodeExecutorDask(source_node)
        target_node_executor = NodeExecutorDask(target_node)

        source_output_type = (
            source_node_executor.node_instance.output_model.model_fields.get(
                link.source_output_key
            )
        )
        target_input_type = (
            target_node_executor.node_instance.input_model.model_fields.get(
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
        dependency_futures: List[Any] = [
            (dep_id, self._submit_node(dep_id))
            for dep_id in self._dependencies.get(node_id, set())
        ]

        # Include initial inputs if available
        initial_input = self._initial_inputs.get(node_id, {})

        # Submit the node execution to Dask
        future = self._client.submit(  # type: ignore because Dask doesn't have type hints
            node_executor.execute_with_dependencies,
            dependency_futures,  # type: List[Tuple[str, Any]]
            self.workflow.links,  # type: List[WorkflowLink]
            self._node_dict,  # type: Dict[str, WorkflowNode]
            initial_input,  # type: Dict[str, Any]
            pure=False,
        )
        self._futures[node_id] = future
        return future

    async def run(
        self, initial_inputs: Dict[str, Dict[str, Any]] = {}
    ) -> Dict[str, BaseModel]:
        if initial_inputs:
            self._initial_inputs = initial_inputs

        # Submit tasks for all nodes
        futures = [self._submit_node(node_id) for node_id in self._node_dict.keys()]

        # Gather results
        task_results = await self._client.gather(futures, asynchronous=True)  # type: ignore because Dask doesn't have type hints
        self._outputs = dict(zip(self._node_dict.keys(), task_results))  # type: ignore because Dask doesn't have type hints
        return self._outputs

    async def __call__(self, initial_inputs: Dict[str, Dict[str, Any]] = {}):
        return await self.run(initial_inputs)

    async def run_batch(
        self, input_iterator: Iterator[Dict[str, Any]], batch_size: int = 100
    ) -> List[Dict[str, BaseModel]]:
        """
        Run the workflow on a batch of inputs.
        """
        results: List[Dict[str, BaseModel]] = []
        batch_tasks: List[Awaitable[Dict[str, BaseModel]]] = []
        for input_data in input_iterator:
            batch_tasks.append(self.run(input_data))
            if len(batch_tasks) == batch_size:
                results.extend(await asyncio.gather(*batch_tasks))
                batch_tasks = []
        if batch_tasks:
            results.extend(await asyncio.gather(*batch_tasks))

        return results

    async def evalaute(
        self,
        input_data: Dict[str, Any],
        expected_output: Dict[str, Any],
        evaluate_fn: Callable[[Dict[str, Any], Dict[str, Any]], Awaitable[bool]] | None = None,  # type: ignore
    ):
        """
        Evaluate the workflow on a single input and compare the output with the expected output.
        """
        output = await self.run(input_data)
        if evaluate_fn is not None:
            match = await evaluate_fn(output, expected_output)
        else:
            match = output == expected_output
        return {
            "input": input_data,
            "output": output,
            "expected_output": expected_output,
            "match": match,
        }

    async def evaluate_batch(
        self,
        examples: Iterator[Tuple[Dict[str, Any], Dict[str, Any]]],
        evaluate_fn: Callable[[Dict[str, Any], Dict[str, Any]], Awaitable[bool]] = None,  # type: ignore
        batch_size: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Evaluate the workflow on a batch of inputs and compare the output with the expected output.
        """
        results: List[Dict[str, Any]] = []
        batch_tasks: List[Awaitable[Dict[str, Any]]] = []
        for input_data, expected_output in examples:
            batch_tasks.append(self.evalaute(input_data, expected_output, evaluate_fn))
            if len(batch_tasks) == batch_size:
                results.extend(await asyncio.gather(*batch_tasks))
                batch_tasks = []
        if batch_tasks:
            results.extend(await asyncio.gather(*batch_tasks))

        return results
