import asyncio
from typing import List

from .string_output_llm import (
    StringOutputLLMNode,
    StringOutputLLMNodeConfig,
    StringOutputLLMNodeInput,
    StringOutputLLMNodeOutput,
)


class MixtureOfAgentsNodeConfig(StringOutputLLMNodeConfig):
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


class MixtureOfAgentsNode(StringOutputLLMNode):
    name: str = "mixture_of_agents_node"
    config_model = MixtureOfAgentsNodeConfig
    input_model = StringOutputLLMNodeInput
    output_model = StringOutputLLMNodeOutput

    def setup(self) -> None:
        super().setup()

        config = self.config
        # Initialize the LLM node for generating samples
        initial_llm_node_config = StringOutputLLMNodeConfig.model_validate(
            config.model_dump()
        )
        self.initial_llm_node = StringOutputLLMNode(initial_llm_node_config)

        # Initialize the LLM node for critiquing responses
        critique_llm_config = StringOutputLLMNodeConfig(
            llm_name=config.llm_name,
            max_tokens=512,
            temperature=0.1,
            system_prompt=config.system_prompt,
            json_mode=config.json_mode,
        )
        self._critique_llm_node = StringOutputLLMNode(critique_llm_config)

        # Initialize the LLM node for generating final response
        final_llm_config = StringOutputLLMNodeConfig(
            llm_name=config.llm_name,
            max_tokens=8192,
            temperature=0.1,
            system_prompt=config.system_prompt,
            json_mode=config.json_mode,
        )
        self._final_llm_node = StringOutputLLMNode(final_llm_config)

    async def _generate_initial_responses(
        self, input_data: StringOutputLLMNodeInput
    ) -> List[StringOutputLLMNodeOutput]:
        tasks = [self.initial_llm_node(input_data) for _ in range(self.config.samples)]
        responses = await asyncio.gather(*tasks)
        return responses

    async def run(
        self, input_data: StringOutputLLMNodeInput
    ) -> StringOutputLLMNodeOutput:
        # Generate initial responses
        initial_responses = await self._generate_initial_responses(input_data)

        # Build the candidates section
        candidates_section: str = ""
        for idx, response in enumerate(initial_responses, start=1):
            candidates_section += f"Candidate {idx}:\n{response.assistant_message}\n\n"

        # Prepare the critique prompt
        critique_prompt: str = self.config.critique_prompt_template.format(
            initial_query=input_data.user_message,
            num_candidates=self.config.samples,
            candidates_section=candidates_section,
        )

        # Build the input for the critique LLM node
        critique_input = StringOutputLLMNodeInput(user_message=critique_prompt)

        # Get the critiques
        critique_output = await self._critique_llm_node(critique_input)
        critiques = critique_output.assistant_message + "\n"  # type: ignore

        # Prepare the final prompt
        final_prompt: str = self.config.final_prompt_template.format(
            initial_query=input_data.user_message,
            candidates_section=candidates_section,
            critiques=critiques,
        )

        # Build the input for the final LLM node
        final_input = self._final_llm_node.input_model.model_validate(
            {"user_message": final_prompt}
        )

        # Get the final response
        final_output = await self._final_llm_node(final_input)

        return StringOutputLLMNodeOutput.model_validate(final_output.model_dump())
