import json
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from ..dynamic_schema import DynamicSchemaNode
from .llm_utils import create_messages, generate_text
from .string_output_llm import ModelName


class AdvancedNodeConfig(BaseModel):
    llm_name: ModelName = Field(
        ModelName.GPT_4O, description="The default LLM model to use"
    )
    max_tokens: int = Field(
        32, ge=1, le=4096, description="Number of tokens, between 1 and 4096"
    )
    temperature: float = Field(
        0.7,
        ge=0.0,
        le=1.0,
        description="Temperature for randomness, between 0.0 and 1.0",
    )
    system_prompt: str = Field(
        "You are a helpful assistant.", description="The system prompt for the LLM"
    )
    output_schema: Dict[str, str]
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
        # TODO: parameterize few_shot_examples

        messages = create_messages(
            system_message=system_message,
            user_message=user_message,
            few_shot_examples=self.config.few_shot_examples,  # Pass examples here
        )
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_name,
            temperature=self.config.temperature,
            json_mode=True,
        )
        assistant_message = json.loads(assistant_message)
        assistant_message = self.output_model.model_validate(assistant_message)
        return assistant_message


if __name__ == "__main__":

    async def test_llm_nodes():
        advanced_llm_node = AdvancedNode(
            config=AdvancedNodeConfig(
                llm_name=ModelName.GPT_4O_MINI,
                max_tokens=32,
                temperature=0.1,
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
