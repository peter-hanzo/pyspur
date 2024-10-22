import asyncio
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeConfig,
)


class SampleLLMNodeConfig(AdvancedLLMNodeConfig):
    samples: int = 1


class SampleLLMNode(DynamicSchemaNode):
    name = "sample_llm_node"
    _llm_node: AdvancedLLMNode
    config_model = SampleLLMNodeConfig

    def setup(self) -> None:
        super().setup()
        self.config_model = SampleLLMNodeConfig

    async def run(self, input_data: BaseModel) -> BaseModel:
        tasks = [self._llm_node(input_data) for _ in range(self.config.samples)]
        responses = await asyncio.gather(*tasks)
        return self.output_model.model_validate(
            [response.dict() for response in responses]
        )
