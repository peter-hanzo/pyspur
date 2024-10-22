import asyncio
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode
from .advanced import (
    AdvancedNode,
    AdvancedNodeConfig,
)


class SampleLLMNodeConfig(AdvancedNodeConfig):
    samples: int = 1


class SampleLLMNode(DynamicSchemaNode):
    name = "sample_llm_node"
    _llm_node: AdvancedNode
    config_model = SampleLLMNodeConfig
    input_model = BaseModel
    output_model = BaseModel

    def setup(self) -> None:
        super().setup()
        self.config_model = SampleLLMNodeConfig

    async def run(self, input_data: BaseModel) -> BaseModel:
        tasks = [self._llm_node(input_data) for _ in range(self.config.samples)]
        responses = await asyncio.gather(*tasks)
        return self.output_model.model_validate(
            [response.dict() for response in responses]
        )
