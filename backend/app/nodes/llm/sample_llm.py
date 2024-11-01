import asyncio

from pydantic import BaseModel, Field

from ..dynamic_schema import DynamicSchemaNode
from .advanced import AdvancedNode, AdvancedNodeConfig
from .llm_utils import LLMModelRegistry, ModelInfo
from ..base import VisualTag


class SampleLLMNodeConfig(AdvancedNodeConfig):
    llm_info: ModelInfo = Field(
        LLMModelRegistry.GPT_4O, description="The default LLM model to use"
    )
    samples: int = Field(1, ge=1, le=10, description="Number of samples to generate")


class SampleLLMNode(DynamicSchemaNode):
    name = "sample_llm_node"
    _llm_node: AdvancedNode
    config_model = SampleLLMNodeConfig
    input_model = BaseModel
    output_model = BaseModel
    visual_tag = VisualTag(acronym="SLN", color="#F4E4D4")

    def setup(self) -> None:
        super().setup()
        self.config_model = SampleLLMNodeConfig

    async def run(self, input_data: BaseModel) -> BaseModel:
        tasks = [self._llm_node(input_data) for _ in range(self.config.samples)]
        responses = await asyncio.gather(*tasks)
        return self.output_model.model_validate(
            [response.dict() for response in responses]
        )
