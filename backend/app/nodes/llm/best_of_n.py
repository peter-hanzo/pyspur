from httpx import get
from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeInput,
    AdvancedLLMNodeOutput,
    AdvancedLLMNodeConfig,
)
from typing import Tuple
import asyncio


class BestOfNNodeConfig(AdvancedLLMNodeConfig):
    samples: int = 3
    rating_prompt: str = (
        "Rate the following response on a scale from 0 to 10, where 0 is poor and 10 is excellent. "
        "Consider factors such as relevance, coherence, and helpfulness. Respond with only a number."
    )
    rating_temperature: float = 0.1
    rating_max_tokens: int = 16


class BestOfNNodeInput(AdvancedLLMNodeInput):
    pass


class BestOfNNodeOutput(AdvancedLLMNodeOutput):
    pass


class BestOfNNode(BaseNode[BestOfNNodeConfig, BestOfNNodeInput, BestOfNNodeOutput]):
    name = "best_of_n_node"

    def __init__(self, config: BestOfNNodeConfig) -> None:
        self.config = config

        # Initialize the LLM node for generating samples
        llm_node_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        self._llm_node = AdvancedLLMNode(llm_node_config)
        self.input_model = self._get_input_model(
            schema=self.config.input_schema, schema_name="BestOfNNodeInput"
        )
        self.output_model = self._get_output_model(
            schema=self.config.output_schema, schema_name="BestOfNNodeOutput"
        )

        # Initialize the LLM node for rating responses
        rating_llm_config = AdvancedLLMNodeConfig(
            llm_name=config.llm_name,
            max_tokens=config.rating_max_tokens,
            temperature=config.rating_temperature,
            system_prompt=config.rating_prompt,
            input_schema=config.output_schema,
            output_schema={"rating": "float"},
        )
        self._rating_llm_node = AdvancedLLMNode(rating_llm_config)

    async def _generate_response_and_rate_it(
        self, input_data: AdvancedLLMNodeInput
    ) -> Tuple[AdvancedLLMNodeOutput, float]:
        response = await self._llm_node(input_data)
        _response = self._rating_llm_node.input_model.model_validate(
            response.model_dump()
        )
        rating_output = await self._rating_llm_node(_response)
        rating = rating_output.model_dump().get("rating", 0.0)
        return response, rating

    async def __call__(self, input_data: BestOfNNodeInput) -> BestOfNNodeOutput:
        tasks = [
            self._generate_response_and_rate_it(input_data)
            for _ in range(self.config.samples)
        ]
        responses_and_ratings = await asyncio.gather(*tasks)
        self._responses_and_ratings = responses_and_ratings
        best_response, _ = max(responses_and_ratings, key=lambda x: x[1])
        return best_response
