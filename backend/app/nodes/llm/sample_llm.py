import asyncio
from re import L
from venv import create
from pydantic import BaseModel, create_model
from typing import List
from ..base import BaseNode
from .llm import (
    AdvancedLLMNode,
    AdvancedLLMNodeInput,
    AdvancedLLMNodeOutput,
    AdvancedLLMNodeConfig,
)


class SampleLLMNodeConfig(AdvancedLLMNodeConfig):
    samples: int = 1


class SampleLLMNodeInput(AdvancedLLMNodeInput):
    pass


class SampleLLMNodeOutput(BaseModel):
    values: List[AdvancedLLMNodeOutput]


class SampleLLMNode(
    BaseNode[SampleLLMNodeConfig, SampleLLMNodeInput, SampleLLMNodeOutput]
):
    name = "sample_llm_node"
    _llm_node: AdvancedLLMNode

    def __init__(self, config: SampleLLMNodeConfig) -> None:
        self.config = config
        llm_node_config = AdvancedLLMNodeConfig.model_validate(config.model_dump())
        self._llm_node = AdvancedLLMNode(llm_node_config)

        self.output_model = create_model(
            "SampleLLMNodeOutput",
            values=(List[self._llm_node.output_model], ...),  # type: ignore
            __base__=SampleLLMNodeOutput,
        )

    async def __call__(self, input_data: SampleLLMNodeInput) -> SampleLLMNodeOutput:
        llm_tasks = []
        for _ in range(self.config.samples):
            llm_tasks.append(self._llm_node(input_data))
        outputs = await asyncio.gather(*llm_tasks)

        return self.output_model.model_validate({"values": outputs})
