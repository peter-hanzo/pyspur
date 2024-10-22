import json
from typing import Any, Dict, Tuple, Set
from pydantic import BaseModel
from ..base import BaseNode
from ...execution.workflow_executor import WorkflowExecutor
from ...execution.workflow_executor_dask import WorkflowExecutorDask
from ...execution.node_executor import NodeExecutor
from ...schemas.workflow import Workflow, WorkflowNode


class SubworkflowNodeConfig(BaseModel):
    workflow_json: str  # JSON string representing the workflow
    use_dask: bool = False  # Optionally use Dask for execution


class SubworkflowNode(BaseNode):
    name: str = "static_workflow_node"
    config_model = SubworkflowNodeConfig

    def setup(self) -> None:
        config = self.config
        self.workflow: Workflow = self._parse_workflow_json(config.workflow_json)
        self._node_dict: Dict[str, WorkflowNode] = {
            node.id: node for node in self.workflow.nodes
        }
        self._dependencies: Dict[str, Set[str]] = self._build_dependencies()
        # Collect input and output schemas
        input_schema = self._collect_input_schema()
        output_schema = self._collect_output_schema()

        # Create input_model and output_model dynamically
        self.input_model = self.get_model_for_schema_dict(
            input_schema, f"{self.name}Input"
        )
        self.output_model = self.get_model_for_schema_dict(
            output_schema, f"{self.name}Output"
        )

    def _parse_workflow_json(self, workflow_json_str: str) -> Workflow:
        # Parse the JSON string into a Workflow object
        workflow_dict = json.loads(workflow_json_str)
        return Workflow.model_validate(workflow_dict)

    def _build_dependencies(self) -> Dict[str, Set[str]]:
        dependencies: Dict[str, Set[str]] = {
            node.id: set() for node in self.workflow.nodes
        }
        for link in self.workflow.links:
            dependencies[link.target_id].add(link.source_id)
        return dependencies

    def _collect_input_schema(self) -> Dict[str, str]:
        """
        Collects the required inputs for the sub-workflow that are not provided by other nodes.
        Also builds a mapping from input field names to node IDs and node input keys.
        """
        input_fields: Dict[str, str] = {}
        self._input_field_to_node_input: Dict[str, Tuple[str, str]] = {}
        for node_id, node in self._node_dict.items():
            node_executor = NodeExecutor(node)
            node_inputs = node_executor.node_instance.input_model.model_fields
            for input_name, field in node_inputs.items():
                # Check if this input is provided by a link
                is_input_satisfied = False
                for link in self.workflow.links:
                    if (
                        link.target_id == node_id
                        and link.target_input_key == input_name
                    ):
                        is_input_satisfied = True
                        break
                if not is_input_satisfied:
                    # This input needs to be provided externally
                    field_name = f"{node_id}__{input_name}"
                    annotation = field.annotation
                    if annotation == None:
                        # Handle variadic inputs
                        continue
                    input_fields[field_name] = str(annotation)
                    self._input_field_to_node_input[field_name] = (node_id, input_name)
        return input_fields

    def _collect_output_schema(self) -> Dict[str, str]:
        """
        Collects the outputs from the sub-workflow that are not consumed by other nodes.
        Also builds a mapping from output field names to node IDs and node output keys.
        """
        # Collect all consumed outputs
        all_consumed_sources: Set[Tuple[str, str]] = set()
        for link in self.workflow.links:
            all_consumed_sources.add((link.source_id, link.source_output_key))

        output_fields: Dict[str, str] = {}
        self._output_field_to_node_output: Dict[str, Tuple[str, str]] = {}
        for node_id, node in self._node_dict.items():
            node_executor = NodeExecutor(node)
            node_outputs = node_executor.node_instance.output_model.model_fields
            for output_name, field in node_outputs.items():
                # Check if this output is consumed
                if (node_id, output_name) not in all_consumed_sources:
                    field_name = f"{node_id}__{output_name}"
                    annotation = field.annotation
                    if annotation == None:
                        # Handle variadic outputs
                        continue
                    output_fields[field_name] = str(annotation)
                    self._output_field_to_node_output[field_name] = (
                        node_id,
                        output_name,
                    )
        return output_fields

    async def __call__(self, input_data: BaseModel) -> BaseModel:
        # Prepare initial inputs for nodes
        initial_inputs: Dict[str, Dict[str, Any]] = {}
        for input_name, value in input_data:
            node_id, node_input_key = self._input_field_to_node_input[input_name]
            if node_id not in initial_inputs:
                initial_inputs[node_id] = {}
            initial_inputs[node_id][node_input_key] = value

        # Execute the workflow
        if self.config.use_dask:
            executor = WorkflowExecutorDask(self.workflow)
        else:
            executor = WorkflowExecutor(self.workflow)
        outputs = await executor(initial_inputs)

        # Extract outputs and return them
        output_data = {}
        for output_name in self.output_model.model_fields:
            node_id, node_output_key = self._output_field_to_node_output[output_name]
            node_output = outputs.get(node_id)
            if node_output is None:
                raise ValueError(f"No output from node {node_id}")
            value = getattr(node_output, node_output_key)
            output_data[output_name] = value

        return self.output_model.model_validate(output_data)
