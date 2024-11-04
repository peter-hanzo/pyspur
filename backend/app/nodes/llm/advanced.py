import json
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig
from .llm_utils import LLMModelRegistry, ModelInfo, create_messages, generate_text
from ..base import VisualTag


class AdvancedNodeConfig(DynamicSchemaNodeConfig):
    llm_info: ModelInfo = Field(
        LLMModelRegistry.GPT_4O, description="The default LLM model to use"
    )
    system_prompt: str = Field(
        "You are a helpful assistant.", description="The system prompt for the LLM"
    )
    input_schema: Dict[str, str] = {"user_message": "str"}
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class AdvancedNodeInput(BaseModel):
    pass


class AdvancedNodeOutput(BaseModel):
    pass


class AdvancedNode(DynamicSchemaNode):
    """
    Node type for calling an LLM with structured i/o and support for params in system prompt and user_input.
    """

    name = "advanced_llm_node"
    config_model = AdvancedNodeConfig
    input_model = AdvancedNodeInput
    output_model = AdvancedNodeOutput
    visual_tag = VisualTag(acronym="ALN", color="#FFC1C1")

    async def run(self, input_data: BaseModel) -> BaseModel:
        system_message = self.config.system_prompt
        output_schema = self.config.output_schema

        input_data_dict = input_data.model_dump()
        system_message = system_message.format(**input_data_dict)
        config_data_dict = self.config.model_dump()
        system_message = system_message.format(**config_data_dict)
        system_message += (
            f"\nMake sure the output follows this JSON schema: {output_schema}"
        )
        user_message = json.dumps(input_data_dict)

        messages = create_messages(
            system_message=system_message,
            user_message=user_message,
            few_shot_examples=self.config.few_shot_examples,
        )
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_info.name,
            temperature=self.config.llm_info.temperature,
            json_mode=True,
        )
        assistant_message = json.loads(assistant_message)
        assistant_message = self.output_model.model_validate(assistant_message)
        return assistant_message


if __name__ == "__main__":

    async def test_llm_nodes():
        advanced_llm_node = AdvancedNode(
            config=AdvancedNodeConfig(
                llm_info=ModelInfo(name="gpt-4o-mini", temperature=0.1, max_tokens=100),
                system_prompt="This is a test prompt.",
                output_schema={"response": "str", "your_name": "str"},
                input_schema={"user_message": "str", "your_name": "str"},
            )
        )
        advanced_input = advanced_llm_node.input_model.model_validate(
            {"user_message": "This is a test message.", "your_name": "tsotsobe"}
        )
        advanced_output = await advanced_llm_node(advanced_input)
        print(advanced_output)

    import asyncio

    asyncio.run(test_llm_nodes())
