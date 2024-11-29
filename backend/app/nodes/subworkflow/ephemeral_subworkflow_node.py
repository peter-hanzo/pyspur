from pydantic import BaseModel
from typing import Dict, Any

from .base_subworkflow_node import BaseSubworkflowNode, BaseSubworkflowNodeConfig
from ...execution.workflow_executor import WorkflowExecutor


class EphemeralSubworkflowNodeConfig(BaseSubworkflowNodeConfig):
    pass


class EphemeralSubworkflowNode(BaseSubworkflowNode):
    name = "ephemeral_subworkflow_node"
    config_model = EphemeralSubworkflowNodeConfig

    async def run(self, input_data: BaseModel) -> BaseModel:
        assert self.subworkflow is not None
        initial_inputs: Dict[str, Dict[str, Any]] = {}
        input_data_dict = input_data.model_dump()
        input_node_id = [
            node.id for node in self.subworkflow.nodes if node.node_type == "InputNode"
        ][0]
        initial_inputs[input_node_id] = input_data_dict

        workflow_executor = WorkflowExecutor(self.subworkflow)
        outputs = await workflow_executor(initial_inputs)
        self.subworkflow_output = outputs
        return self._transform_workflow_output_to_node_output(outputs)
