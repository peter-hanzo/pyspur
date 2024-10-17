# https://arxiv.org/abs/2406.04692
from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeInput,
    AdvancedLLMNodeOutput,
    AdvancedLLMNodeConfig,
)
import asyncio
from typing import List


class MixtureOfAgentsNodeConfig(AdvancedLLMNodeConfig):
    samples: int = 3
    critique_prompt_template: str = (
        "Original query: {initial_query}\n\n"
        "I will present you with {num_candidates} candidate responses to the original query. "
        "Please analyze and critique each response, discussing their strengths and weaknesses. "
        "Provide your analysis for each candidate separately.\n\n"
        "{candidates_section}"
        "Please provide your critique for each candidate:"
    )
    final_prompt_template: str = (
        "Original query: {initial_query}\n\n"
        "Based on the following candidate responses and their critiques, generate a final response to the original query.\n\n"
        "{candidates_section}"
        "Critiques of all candidates:\n{critiques}\n\n"
        "Please provide a final, optimized response to the original query:"
    )


class MixtureOfAgentsNodeInput(AdvancedLLMNodeInput):
    pass


class MixtureOfAgentsNodeOutput(AdvancedLLMNodeOutput):
    pass


class MixtureOfAgentsNode(
    BaseNode[
        MixtureOfAgentsNodeConfig, MixtureOfAgentsNodeInput, MixtureOfAgentsNodeOutput
    ]
):
    name: str = "mixture_of_agents_node"

    def __init__(self, config: MixtureOfAgentsNodeConfig) -> None:
        self.config: MixtureOfAgentsNodeConfig = config

        # Initialize the LLM node for generating samples
        llm_node_config: AdvancedLLMNodeConfig = AdvancedLLMNodeConfig.model_validate(
            config.model_dump()
        )
        self._llm_node: AdvancedLLMNode = AdvancedLLMNode(llm_node_config)

        # Initialize the LLM node for critiquing responses
        critique_llm_config: AdvancedLLMNodeConfig = AdvancedLLMNodeConfig(
            llm_name=config.llm_name,
            max_tokens=512,
            temperature=0.1,
            system_prompt=config.system_prompt,
            input_schema={"prompt": "str"},
            output_schema={"response": "str"},
        )
        self._critique_llm_node: AdvancedLLMNode = AdvancedLLMNode(critique_llm_config)

        # Initialize the LLM node for generating final response
        final_llm_config: AdvancedLLMNodeConfig = AdvancedLLMNodeConfig(
            llm_name=config.llm_name,
            max_tokens=8192,
            temperature=0.1,
            system_prompt=config.system_prompt,
            input_schema={"prompt": "str"},
            output_schema={"response": "str"},
        )
        self._final_llm_node: AdvancedLLMNode = AdvancedLLMNode(final_llm_config)

        # Set input and output types
        self.InputType = self._llm_node.InputType
        self.OutputType = self._llm_node.OutputType

    async def _generate_initial_responses(
        self, input_data: AdvancedLLMNodeInput
    ) -> List[AdvancedLLMNodeOutput]:
        tasks: List[asyncio.Task] = [
            self._llm_node(input_data) for _ in range(self.config.samples)
        ]
        responses: List[AdvancedLLMNodeOutput] = await asyncio.gather(*tasks)
        return responses

    async def __call__(
        self, input_data: MixtureOfAgentsNodeInput
    ) -> MixtureOfAgentsNodeOutput:
        # Generate initial responses
        initial_responses: List[AdvancedLLMNodeOutput] = (
            await self._generate_initial_responses(input_data)
        )

        # Build the candidates section
        candidates_section: str = ""
        for idx, response in enumerate(initial_responses, start=1):
            candidates_section += f"Candidate {idx}:\n{response.response}\n\n"

        # Prepare the critique prompt
        critique_prompt: str = self.config.critique_prompt_template.format(
            initial_query=input_data.prompt,
            num_candidates=self.config.samples,
            candidates_section=candidates_section,
        )

        # Build the input for the critique LLM node
        critique_input: AdvancedLLMNodeInput = self._critique_llm_node.InputType(
            prompt=critique_prompt
        )

        # Get the critiques
        critique_output: AdvancedLLMNodeOutput = await self._critique_llm_node(
            critique_input
        )
        critiques: str = critique_output.response

        # Prepare the final prompt
        final_prompt: str = self.config.final_prompt_template.format(
            initial_query=input_data.prompt,
            candidates_section=candidates_section,
            critiques=critiques,
        )

        # Build the input for the final LLM node
        final_input: AdvancedLLMNodeInput = self._final_llm_node.InputType(
            prompt=final_prompt
        )

        # Get the final response
        final_output: AdvancedLLMNodeOutput = await self._final_llm_node(final_input)

        return final_output
