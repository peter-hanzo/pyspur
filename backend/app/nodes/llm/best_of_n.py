from pydantic import BaseModel
from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
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


class BestOfNNode(BaseNode):
    name = "best_of_n_node"

    def setup(self) -> None:
        self.config_model = BestOfNNodeConfig
        self.input_model = self.get_model_for_schema_dict(
            self.config.input_schema, "BestOfNNodeInput"
        )
        self.output_model = self.get_model_for_schema_dict(
            self.config.output_schema, "BestOfNNodeOutput"
        )

        # Initialize the LLM node for generating samples
        llm_node_config = AdvancedLLMNodeConfig.model_validate(self.config.model_dump())
        self._llm_node = AdvancedLLMNode(llm_node_config)

        # Initialize the LLM node for rating responses
        rating_llm_config = AdvancedLLMNodeConfig(
            llm_name=self.config.llm_name,
            max_tokens=self.config.rating_max_tokens,
            temperature=self.config.rating_temperature,
            system_prompt=self.config.rating_prompt,
            input_schema=self.config.output_schema,
            output_schema={"rating": "float"},
        )
        self._rating_llm_node = AdvancedLLMNode(rating_llm_config)

    async def _generate_response_and_rate_it(
        self, input_data: BaseModel
    ) -> Tuple[BaseModel, float]:
        response = await self._llm_node(input_data)
        _response = self._rating_llm_node.input_model.model_validate(
            response.model_dump()
        )
        rating_output = await self._rating_llm_node(_response)
        rating = rating_output.model_dump().get("rating", 0.0)
        return response, float(rating)

    async def run(self, input_data: BaseModel) -> BaseModel:
        tasks = [
            self._generate_response_and_rate_it(input_data)
            for _ in range(self.config.samples)
        ]
        responses_and_ratings = await asyncio.gather(*tasks)
        self._responses_and_ratings = responses_and_ratings
        best_response, _ = max(responses_and_ratings, key=lambda x: x[1])
        return best_response
