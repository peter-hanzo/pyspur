from typing import Dict
from pydantic import Field
from ..llm_utils import LLMModels, ModelInfo
from ...subworkflow.ephemeral_subworkflow_node import EphemeralSubworkflowNode
from ...dynamic_schema import DynamicSchemaNodeConfig
from ....schemas.workflow_schemas import (
    WorkflowDefinitionSchema,
    WorkflowNodeSchema,
    WorkflowLinkSchema,
)


class BranchSolveMergeNodeConfig(DynamicSchemaNodeConfig):
    branch_system_message: str = Field(
        default="Please decompose the following task into logical subtasks that making solving overall task easier.",
        description="The prompt for the branch LLM",
    )
    solve_system_message: str = Field(
        default="Please provide a detailed solution for the following subtask:",
        description="The prompt for the solve LLM",
    )
    merge_system_message: str = Field(
        default="Please combine the following solutions into a coherent and comprehensive final answer.",
        description="The prompt for the merge LLM",
    )
    llm_info: ModelInfo = Field(
        default_factory=lambda: ModelInfo(
            model=LLMModels.GPT_4O, max_tokens=16384, temperature=0.7
        ),
        description="The default LLM model to use",
    )
    input_schema: Dict[str, str] = Field(default={"task": "str"})
    output_schema: Dict[str, str] = Field(default={"response": "str"})


class BranchSolveMergeNode(EphemeralSubworkflowNode):
    name = "branch_solve_merge_node"
    display_name = "Branch Solve Merge"
    config_model = BranchSolveMergeNodeConfig

    def generate_branch_solve_merge_workflow(self) -> WorkflowDefinitionSchema:
        nodes: list[WorkflowNodeSchema] = []
        links: list[WorkflowLinkSchema] = []

        # Input node
        input_node_id = "input_node"
        input_node = WorkflowNodeSchema(
            id=input_node_id,
            node_type="InputNode",
            config={"input_schema": self.config.input_schema},
        )
        nodes.append(input_node)

        # Branch node
        branch_node_id = "branch_node"
        branch_node = WorkflowNodeSchema(
            id=branch_node_id,
            node_type="SingleLLMCallNode",
            config={
                "llm_info": self.config.llm_info.model_dump(),
                "system_message": self.config.branch_system_message,
                "user_message": self.get_jinja2_template_for_fields(
                    list(self.config.input_schema.keys())
                ),
                "input_schema": self.config.input_schema,
                "output_schema": {"subtasks": "list[str]"},
            },
        )
        nodes.append(branch_node)

        # Link input node to branch node
        for input_key in self.config.input_schema.keys():
            links.append(
                WorkflowLinkSchema(
                    source_id=input_node_id,
                    source_output_key=input_key,
                    target_id=branch_node_id,
                    target_input_key=input_key,
                )
            )

        # Solve node
        solve_node_id = "solve_node"
        solve_node = WorkflowNodeSchema(
            id=solve_node_id,
            node_type="SingleLLMCallNode",
            config={
                "llm_info": self.config.llm_info.model_dump(),
                "system_message": self.config.solve_system_message,
                "user_message": self.get_jinja2_template_for_fields(
                    list(branch_node.config["input_schema"].keys())
                    + list(branch_node.config["output_schema"].keys())
                ),
                "input_schema": {"subtasks": "list[str]"}
                | branch_node.config["input_schema"],
                "output_schema": {"subtask_solutions": "list[str]"},
            },
        )
        nodes.append(solve_node)

        for input_key in branch_node.config["input_schema"].keys():
            links.append(
                WorkflowLinkSchema(
                    source_id=input_node_id,
                    source_output_key=input_key,
                    target_id=solve_node_id,
                    target_input_key=input_key,
                )
            )

        # Link branch node to solve node
        links.append(
            WorkflowLinkSchema(
                source_id=branch_node_id,
                source_output_key="subtasks",
                target_id=solve_node_id,
                target_input_key="subtasks",
            )
        )

        # Merge node
        merge_node_id = "merge_node"
        merge_node = WorkflowNodeSchema(
            id=merge_node_id,
            node_type="SingleLLMCallNode",
            config={
                "llm_info": self.config.llm_info.model_dump(),
                "system_message": self.config.merge_system_message,
                "user_message": self.get_jinja2_template_for_fields(
                    ["subtask_solutions"]
                    + list(branch_node.config["input_schema"].keys())
                ),
                "input_schema": {"subtask_solutions": "list[str]"}
                | branch_node.config["input_schema"],
                "output_schema": self.config.output_schema,
            },
        )
        nodes.append(merge_node)

        for input_key in branch_node.config["input_schema"].keys():
            links.append(
                WorkflowLinkSchema(
                    source_id=input_node_id,
                    source_output_key=input_key,
                    target_id=merge_node_id,
                    target_input_key=input_key,
                )
            )

        # Link solve node to merge node
        links.append(
            WorkflowLinkSchema(
                source_id=solve_node_id,
                source_output_key="subtask_solutions",
                target_id=merge_node_id,
                target_input_key="subtask_solutions",
            )
        )

        # Output node
        output_node_id = "output_node"
        output_node = WorkflowNodeSchema(
            id=output_node_id,
            node_type="OutputNode",
            config={"output_schema": self.config.output_schema},
        )
        nodes.append(output_node)

        # Link merge node to output node
        for output_key in self.config.output_schema.keys():
            links.append(
                WorkflowLinkSchema(
                    source_id=merge_node_id,
                    source_output_key=output_key,
                    target_id=output_node_id,
                    target_input_key=output_key,
                )
            )

        return WorkflowDefinitionSchema(nodes=nodes, links=links)

    def setup(self) -> None:
        self.subworkflow = self.generate_branch_solve_merge_workflow()
        super().setup()
