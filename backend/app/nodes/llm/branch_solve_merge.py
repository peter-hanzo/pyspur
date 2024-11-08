from pydantic import BaseModel, Field

from ..base import BaseNode, VisualTag
from .single_llm_call import SingleLLMCallNode, SingleLLMCallNodeConfig
from .llm_utils import LLMModelRegistry, ModelInfo


class BranchSolveMergeNodeConfig(SingleLLMCallNodeConfig):
    llm_info: ModelInfo = Field(
        LLMModelRegistry.GPT_4O, description="The default LLM model to use"
    )
    system_prompt: str = Field(
        "You are a helpful assistant.",
        description="The system prompt for the LLM",
    )
    branch_prompt: str = Field(
        "Please decompose the following task into multiple subtasks.",
        description="The prompt for the branch LLM",
    )
    solve_prompt: str = Field(
        "Please provide a detailed solution for the following subtask:",
        description="The prompt for the solve LLM",
    )
    merge_prompt: str = Field(
        "Please combine the following solutions into a coherent and comprehensive final answer."
    )


class BranchSolveMergeNode(BaseNode):
    name = "branch_solve_merge_node"
    config_model = BranchSolveMergeNodeConfig
    input_model = BaseModel
    output_model = BaseModel
    visual_tag = VisualTag(acronym="BSM", color="#C1FFD1")

    def setup(self) -> None:
        config = self.config

        # Initialize the LLM node for the branch module
        branch_node_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        branch_node_config.output_schema = {"subtasks": "list[str]"}
        branch_node_config.system_prompt = config.branch_prompt
        self._branch_node = SingleLLMCallNode(branch_node_config)

        # Initialize the LLM node for the solve module
        solve_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        solve_config.system_prompt = config.solve_prompt
        solve_config.input_schema = branch_node_config.output_schema
        solve_config.output_schema = {"subtask_solutions": "list[str]"}
        self._solve_node = SingleLLMCallNode(solve_config)

        # Initialize the LLM node for the merge module
        merge_config = SingleLLMCallNodeConfig.model_validate(config.model_dump())
        merge_config.system_prompt = config.merge_prompt
        merge_config.input_schema = solve_config.output_schema
        self._merge_node = SingleLLMCallNode(merge_config)

        # Set input and output types
        self.input_model = self._branch_node.input_model
        self.output_model = self._merge_node.output_model

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Step 1: Branch - generate subtasks
        subtasks = await self._branch_node(input_data)

        # Step 2: Solve - solve each subtask in parallel
        solutions = await self._solve_node(subtasks)  # type: ignore

        # Step 3: Merge - combine the solutions into final output
        final_output = await self._merge_node(solutions)  # type: ignore

        return final_output
