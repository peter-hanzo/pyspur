from pydantic import BaseModel
from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeConfig,
)


class BranchSolveMergeNodeConfig(AdvancedLLMNodeConfig):
    system_prompt: str = ""
    branch_prompt: str = "Please decompose the following task into multiple subtasks."
    solve_prompt: str = "Please provide a detailed solution for the following subtask:"
    merge_prompt: str = (
        "Please combine the following solutions into a coherent and comprehensive final answer."
    )


class BranchSolveMergeNode(BaseNode):
    name = "branch_solve_merge_node"
    config_model = BranchSolveMergeNodeConfig

    def setup(self) -> None:
        config = self.config

        # Initialize the LLM node for the branch module
        branch_node_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        branch_node_config.output_schema = {"subtasks": "list[str]"}
        branch_node_config.system_prompt = config.branch_prompt
        self._branch_node = AdvancedLLMNode(branch_node_config)

        # Initialize the LLM node for the solve module
        solve_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        solve_config.system_prompt = config.solve_prompt
        solve_config.input_schema = branch_node_config.output_schema
        solve_config.output_schema = {"subtask_solutions": "list[str]"}
        self._solve_node = AdvancedLLMNode(solve_config)

        # Initialize the LLM node for the merge module
        merge_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        merge_config.system_prompt = config.merge_prompt
        merge_config.input_schema = solve_config.output_schema
        self._merge_node = AdvancedLLMNode(merge_config)

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
