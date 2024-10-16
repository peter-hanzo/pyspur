from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeInput,
    AdvancedLLMNodeOutput,
    AdvancedLLMNodeConfig,
)
import asyncio
from typing import List


class BranchSolveMergeNodeConfig(AdvancedLLMNodeConfig):
    branch_prompt: str = (
        "Please decompose the following task into multiple subtasks. "
        "List each subtask on a new line."
    )
    solve_prompt: str = "Please provide a detailed solution for the following subtask:"
    merge_prompt: str = (
        "Please combine the following solutions into a coherent and comprehensive final answer."
    )


class BranchSolveMergeNodeInput(AdvancedLLMNodeInput):
    pass


class BranchSolveMergeNodeOutput(AdvancedLLMNodeOutput):
    pass


class BranchSolveMergeNode(
    BaseNode[
        BranchSolveMergeNodeConfig,
        BranchSolveMergeNodeInput,
        BranchSolveMergeNodeOutput,
    ]
):
    name = "branch_solve_merge_node"

    def __init__(self, config: BranchSolveMergeNodeConfig) -> None:
        self.config = config

        # Initialize the LLM node for the branch module
        branch_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        branch_config.system_prompt = config.branch_prompt
        self._branch_node = AdvancedLLMNode(branch_config)

        # Initialize the LLM node for the solve module
        solve_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        solve_config.system_prompt = config.solve_prompt
        self._solve_node = AdvancedLLMNode(solve_config)

        # Initialize the LLM node for the merge module
        merge_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        merge_config.system_prompt = config.merge_prompt
        self._merge_node = AdvancedLLMNode(merge_config)

        # Set input and output types
        self.InputType = self._branch_node.InputType
        self.OutputType = self._merge_node.OutputType

    async def __call__(
        self, input_data: BranchSolveMergeNodeInput
    ) -> BranchSolveMergeNodeOutput:
        # Step 1: Branch - generate subtasks
        subtasks = await self._generate_subtasks(input_data)

        # Step 2: Solve - solve each subtask in parallel
        solutions = await self._solve_subtasks(subtasks)

        # Step 3: Merge - combine the solutions into final output
        final_output = await self._merge_solutions(solutions)

        return final_output

    async def _generate_subtasks(self, input_data: AdvancedLLMNodeInput) -> List[str]:
        branch_output = await self._branch_node(input_data)
        subtasks = self._extract_subtasks(branch_output)
        return subtasks

    def _extract_subtasks(self, branch_output: AdvancedLLMNodeOutput) -> List[str]:
        # Extract subtasks from the branch output
        # Assume each subtask is separated by a newline character
        subtasks = branch_output.content.strip().split("\n")
        return [subtask.strip() for subtask in subtasks if subtask.strip()]

    async def _solve_subtasks(self, subtasks: List[str]) -> List[AdvancedLLMNodeOutput]:
        tasks = [self._solve_subtask(subtask) for subtask in subtasks]
        solutions = await asyncio.gather(*tasks)
        return solutions

    async def _solve_subtask(self, subtask: str) -> AdvancedLLMNodeOutput:
        solve_input = self._solve_node.InputType(content=subtask)
        solution = await self._solve_node(solve_input)
        return solution

    async def _merge_solutions(
        self, solutions: List[AdvancedLLMNodeOutput]
    ) -> BranchSolveMergeNodeOutput:
        merge_input = self._prepare_merge_input(solutions)
        final_output = await self._merge_node(merge_input)
        return final_output

    def _prepare_merge_input(
        self, solutions: List[AdvancedLLMNodeOutput]
    ) -> AdvancedLLMNodeInput:
        # Prepare input for the merge node by combining all solutions
        solutions_text = "\n\n".join([solution.content for solution in solutions])
        merge_input = self._merge_node.InputType(content=solutions_text)
        return merge_input
