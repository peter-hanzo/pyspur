import asyncio
from difflib import SequenceMatcher
from typing import List

from pydantic import Field

from ..base import BaseNode
from .llm_utils import LLMModelRegistry, ModelInfo
from .string_output_llm import (StringOutputLLMNode, StringOutputLLMNodeConfig,
                                StringOutputLLMNodeInput,
                                StringOutputLLMNodeOutput)


class SelfConsistencyNodeConfig(StringOutputLLMNodeConfig):
    llm_info: ModelInfo = Field(
        LLMModelRegistry.GPT_4O, description="The default LLM model to use"
    )
    samples: int = Field(5, ge=1, le=10, description="Number of samples to generate")
    similarity_threshold: float = Field(
        0.8, ge=0.0, le=1.0, description="Similarity threshold"
    )


class SelfConsistencyNode(BaseNode):
    name = "self_consistency_node"
    config_model = SelfConsistencyNodeConfig
    input_model = StringOutputLLMNodeInput
    output_model = StringOutputLLMNodeOutput

    def setup(self) -> None:
        config = self.config
        self._llm_node = StringOutputLLMNode(config)

    async def _generate_responses(
        self, input_data: StringOutputLLMNodeInput
    ) -> List[StringOutputLLMNodeOutput]:
        tasks = [self._llm_node(input_data) for _ in range(self.config.samples)]
        return await asyncio.gather(*tasks)

    def _calculate_similarity(self, a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    def _cluster_similar_responses(self, responses: List[str]) -> List[List[str]]:
        clusters: List[List[str]] = []
        for response in responses:
            added_to_cluster = False
            for cluster in clusters:
                if (
                    self._calculate_similarity(response, cluster[0])
                    >= self.config.similarity_threshold
                ):
                    cluster.append(response)
                    added_to_cluster = True
                    break
            if not added_to_cluster:
                clusters.append([response])
        return clusters

    async def run(
        self, input_data: StringOutputLLMNodeInput
    ) -> StringOutputLLMNodeOutput:
        responses = await self._generate_responses(input_data)
        response_texts: List[str] = [
            response.assistant_message for response in responses
        ]  # Assuming response has a 'text' attribute
        clusters = self._cluster_similar_responses(response_texts)

        # Sort clusters by frequency and select the most frequent one
        clusters.sort(key=lambda x: len(x), reverse=True)
        best_cluster = clusters[0] if clusters else []

        # Return the representative answer from the best cluster
        best_response_text = (
            best_cluster[0] if best_cluster else "No consistent answer found."
        )
        return StringOutputLLMNodeOutput(assistant_message=best_response_text)
