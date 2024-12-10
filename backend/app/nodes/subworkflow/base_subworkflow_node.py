from abc import ABC
from typing import Any, Dict, Set

from pydantic import BaseModel, Field
from ...schemas.workflow_schemas import WorkflowNodeSchema
from ..base import BaseNode, BaseNodeConfig
from ...execution.workflow_executor import WorkflowExecutor
from ...utils.pydantic_utils import get_nested_field


class BaseSubworkflowNodeConfig(BaseNodeConfig):
    input_map: Dict[str, str] = Field(
        default={},
        title="Input map",
        description="Map of input variables to subworkflow input fields expressed as Dict[<subworkflow_input_field>, <input_variable_path>]",
    )


class BaseSubworkflowNode(BaseNode, ABC):
    name: str = "static_workflow_node"
    config_model = BaseSubworkflowNodeConfig

    def setup(self) -> None:
        super().setup()

    def setup_subworkflow(self) -> None:
        assert self.subworkflow is not None
        self._node_dict: Dict[str, WorkflowNodeSchema] = {
            node.id: node for node in self.subworkflow.nodes
        }
        self._dependencies: Dict[str, Set[str]] = self._build_dependencies()

        self._subworkflow_output_node = next(
            (node for node in self.subworkflow.nodes if node.node_type == "OutputNode")
        )
        output_schema = self._subworkflow_output_node.config["output_schema"]
        self.output_model = self.create_output_model_class(output_schema)

    def _build_dependencies(self) -> Dict[str, Set[str]]:
        assert self.subworkflow is not None
        dependencies: Dict[str, Set[str]] = {
            node.id: set() for node in self.subworkflow.nodes
        }
        for link in self.subworkflow.links:
            dependencies[link.target_id].add(link.source_id)
        return dependencies

    def _map_input(self, input: BaseModel) -> Dict[str, Any]:
        if self.config.input_map == {}:
            return input.model_dump()
        mapped_input: Dict[str, Any] = {}
        for subworkflow_input_field, input_var_path in self.config.input_map.items():
            input_var = get_nested_field(input_var_path, input)
            mapped_input[subworkflow_input_field] = input_var
        return mapped_input

    async def run(self, input: BaseModel) -> BaseModel:
        self.setup_subworkflow()
        assert self.subworkflow is not None
        if self.subworkflow_output is None:
            self.subworkflow_output = {}
        mapped_input = self._map_input(input)
        input_node = next(
            (node for node in self.subworkflow.nodes if node.node_type == "InputNode")
        )
        input_dict = {input_node.id: mapped_input}
        workflow_executor = WorkflowExecutor(
            workflow=self.subworkflow, context=self.context
        )
        outputs = await workflow_executor.run(
            input_dict, precomputed_outputs=self.subworkflow_output
        )
        self.subworkflow_output.update(outputs)
        return self.subworkflow_output[self._subworkflow_output_node.id]
