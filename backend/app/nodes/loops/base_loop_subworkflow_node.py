from abc import abstractmethod
from pydantic import BaseModel

from ...execution.workflow_executor import WorkflowExecutor
from ..subworkflow.base_subworkflow_node import (
    BaseSubworkflowNode,
    BaseSubworkflowNodeConfig,
)
from ...schemas.workflow_schemas import (
    LoopSubworkflowDefinitionSchema,
    WorkflowDefinitionSchema,
)


class BaseLoopSubworkflowNodeConfig(BaseSubworkflowNodeConfig):
    loop_subworkflow: LoopSubworkflowDefinitionSchema


class BaseLoopSubworkflowNode(BaseSubworkflowNode):
    name = "loop_subworkflow_node"
    config_model = BaseLoopSubworkflowNodeConfig
    iteration: int

    def setup(self) -> None:
        super().setup()

    @abstractmethod
    async def stopping_condition(self, input: BaseModel) -> bool:
        pass

    def setup_subworkflow_for_next_iteration(self) -> None:
        if self.iteration == 0:
            subworkflow: LoopSubworkflowDefinitionSchema = (
                self.config.loop_subworkflow.subworkflow
            )
            nodes = subworkflow.nodes
            links = subworkflow.links
            nodes = [
                node.model_copy(update={"id": f"{node.id}_{self.iteration}"})
                for node in nodes
            ]
            links = [
                link.model_copy(
                    update={
                        "source_id": f"{link.source_id}_{self.iteration}",
                        "target_id": f"{link.target_id}_{self.iteration}",
                    }
                )
                for link in links
            ]
            self.subworkflow = WorkflowDefinitionSchema(
                nodes=nodes,
                links=links,
            )
            self.setup_subworkflow()
            return

        assert self.subworkflow is not None
        current_subworkflow = self.subworkflow
        nodes = current_subworkflow.nodes
        links = current_subworkflow.links

        # extend the current subworkflow with the next iteration
        loop_subworkflow: LoopSubworkflowDefinitionSchema = self.config.loop_subworkflow
        next_iter_nodes = [
            node.model_copy(update={"id": f"{node.id}_{self.iteration}"})
            for node in loop_subworkflow.nodes
        ]
        next_iter_links = [
            link.model_copy(
                update={
                    "source_id": f"{link.source_id}_{self.iteration}",
                    "target_id": f"{link.target_id}_{self.iteration}",
                }
            )
            for link in loop_subworkflow.links
        ]

        # connect the EOI node of the last iteration to the input of the next iteration
        current_end_of_iteration_node = next(
            node
            for node in nodes
            if node.node_type == "EndOfIterationNode"
            and node.id.endswith(f"_{self.iteration - 1}")
        )
        next_iter_input_node = next(
            node for node in next_iter_nodes if node.node_type == "InputNode"
        )
        # replace all links from InputNode in next_iter with links from EOI node in current
        next_iter_links = [
            link.model_copy(
                update={
                    "source_id": (
                        current_end_of_iteration_node.id
                        if link.source_id == next_iter_input_node.id
                        else link.source_id
                    ),
                }
            )
            for link in next_iter_links
        ]
        # remove the input node
        next_iter_nodes = [
            node for node in next_iter_nodes if node.node_type != "InputNode"
        ]

        self.subworkflow = WorkflowDefinitionSchema(
            nodes=nodes + next_iter_nodes,
            links=links + next_iter_links,
        )

        self.setup_subworkflow()

    async def run_iteration(self, input: BaseModel) -> BaseModel:
        self.setup_subworkflow_for_next_iteration()
        assert self.subworkflow is not None
        # Map input
        mapped_input = self._map_input(input)

        # Prepare inputs for subworkflow
        input_node = next(
            (node for node in self.subworkflow.nodes if node.node_type == "InputNode")
        )
        input_dict = {input_node.id: mapped_input}

        # Use stored outputs to avoid re-running nodes
        precomputed_outputs = self.subworkflow_output or {}

        # Execute the subworkflow
        workflow_executor = WorkflowExecutor(
            workflow=self.subworkflow, context=self.context
        )
        outputs = await workflow_executor.run(
            input_dict, precomputed_outputs=precomputed_outputs
        )

        # Store outputs for potential reuse
        if self.subworkflow_output is None:
            self.subworkflow_output = outputs
        else:
            self.subworkflow_output.update(outputs)

        # Get the output of the latest end of iteration node
        end_of_iteration_node = next(
            node
            for node in self.subworkflow.nodes
            if node.node_type == "EndOfIterationNode"
            and node.id.endswith(f"_{self.iteration}")
        )
        return self.subworkflow_output[end_of_iteration_node.id]

    async def run(self, input: BaseModel) -> BaseModel:
        self.iteration = 0
        while await self.stopping_condition(input):
            output = await self.run_iteration(input)
            input = output
            self.iteration += 1
        return input
