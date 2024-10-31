from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from ..base import BaseNode
from .llm_utils import LLMModelRegistry, ModelInfo, create_messages, generate_text


class StringOutputLLMNodeConfig(BaseModel):
    llm_info: ModelInfo = Field(
        LLMModelRegistry.GPT_4O_MINI, description="The default LLM model to use"
    )
    system_prompt: str = Field(
        "You are a helpful assistant.", description="The system prompt for the LLM"
    )
    json_mode: bool = Field(False, description="Whether to use JSON mode for the LLM")
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class StringOutputLLMNodeInput(BaseModel):
    user_message: str


class StringOutputLLMNodeOutput(BaseModel):
    assistant_message: str


class StringOutputLLMNode(BaseNode):
    """
    Basic node type for calling an LLM.
    """

    name = "string_output_llm_node"
    config_model = StringOutputLLMNodeConfig
    input_model = StringOutputLLMNodeInput
    output_model = StringOutputLLMNodeOutput

    def setup(self) -> None:
        pass

    async def run(
        self, input_data: StringOutputLLMNodeInput
    ) -> StringOutputLLMNodeOutput:
        system_message = self.config.system_prompt
        messages = create_messages(
            system_message=system_message,
            user_message=input_data.user_message,
            few_shot_examples=self.config.few_shot_examples,  # Pass examples here
        )
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_name.name,
            temperature=self.config.temperature,
            json_mode=self.config.json_mode,
        )
        return StringOutputLLMNodeOutput(assistant_message=assistant_message)


if __name__ == "__main__":

    async def test_llm_nodes():
        string_output_llm_node = StringOutputLLMNode(
            config=StringOutputLLMNodeConfig(
                llm_name=LLMModelRegistry.GPT_4O_MINI,
                max_tokens=32,
                temperature=0.1,
                json_mode=False,
                system_prompt="This is a test prompt.",
            )
        )
        basic_input = StringOutputLLMNodeInput(user_message="This is a test message.")
        basic_output = await string_output_llm_node(basic_input)
        print(basic_output)
        print("-" * 50)

    import asyncio

    asyncio.run(test_llm_nodes())
