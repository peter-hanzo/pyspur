from typing import Dict
from pydantic import BaseModel, Field

from ...nodes.dynamic_schema import DynamicSchemaNodeConfig, DynamicSchemaNode
from ..base import VisualTag
from .single_llm_call import SingleLLMCallNode, SingleLLMCallNodeConfig
from .llm_utils import LLMModels, ModelInfo


class BranchSolveMergeNodeConfig(DynamicSchemaNodeConfig):
    input_schema: Dict[str, str] = {"task": "str"}
    llm_info: ModelInfo = Field(
        ModelInfo(model=LLMModels.GPT_4O, max_tokens=16384, temperature=0.7),
        description="The default LLM model to use",
    )
    branch_system_message: str = Field(
        "Please decompose the following task into multiple subtasks.",
        description="The prompt for the branch LLM",
    )
    solve_system_message: str = Field(
        "Please provide a detailed solution for the following subtask:",
        description="The prompt for the solve LLM",
    )
    merge_system_message: str = Field(
        "Please combine the following solutions into a coherent and comprehensive final answer."
    )


class BranchSolveMergeNode(DynamicSchemaNode):
    """Node type for branching problem solving with LLM."""

    name = "branch_solve_merge_node"
    display_name = "Branch Solve Merge"
    config_model = BranchSolveMergeNodeConfig
    input_model = BaseModel
    output_model = BaseModel
    visual_tag = VisualTag(acronym="BSM", color="#C1FFD1")

    def setup(self) -> None:
        config = self.config

        # Initialize the LLM node for the branch module
        branch_node_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        branch_node_config.output_schema = {"subtasks": "list[str]"}
        branch_node_config.system_message = config.branch_system_message
        branch_node_config.user_message = self.get_jinja2_template_for_fields(
            list(branch_node_config.input_schema.keys())
        )
        self._branch_node = SingleLLMCallNode(branch_node_config)

        # Initialize the LLM node for the solve module
        solve_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        solve_config.system_message = config.solve_system_message
        # the input to solve_node is the output of branch_node + the input to branch_node
        solve_config.input_schema = (
            branch_node_config.output_schema | branch_node_config.input_schema
        )
        solve_config.output_schema = {"subtask_solutions": "list[str]"}
        solve_config.user_message = self.get_jinja2_template_for_fields(
            list(solve_config.input_schema.keys())
        )
        self._solve_node = SingleLLMCallNode(solve_config)

        # Initialize the LLM node for the merge module
        merge_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        merge_config.system_message = config.merge_system_message
        merge_config.input_schema = (
            solve_config.output_schema | branch_node_config.input_schema
        )
        merge_config.user_message = self.get_jinja2_template_for_fields(
            list(merge_config.input_schema.keys())
        )
        self._merge_node = SingleLLMCallNode(merge_config)

        # Set input and output types
        self.input_model = self._branch_node.input_model
        self.output_model = self._merge_node.output_model

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Step 1: Branch - generate subtasks
        subtasks = await self._branch_node(input_data)

        # Step 2: Solve - solve each subtask
        solve_config_data = self._solve_node.config.model_dump()
        self._solve_node = SingleLLMCallNode(
            SingleLLMCallNodeConfig.model_validate(solve_config_data)
        )
        solve_node_input = {**subtasks.model_dump(), **input_data.model_dump()}
        solutions = await self._solve_node(solve_node_input)

        # Step 3: Merge - combine the solutions into final output
        merge_config_data = self._merge_node.config.model_dump()
        self._merge_node = SingleLLMCallNode(
            SingleLLMCallNodeConfig.model_validate(merge_config_data)
        )
        merge_node_input = {**solutions.model_dump(), **input_data.model_dump()}
        final_output = await self._merge_node(merge_node_input)

        return final_output
