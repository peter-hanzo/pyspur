import json
from typing import Dict, List, Optional
from pydantic import BaseModel
from .llm_utils import create_messages, generate_text
from ..base import BaseNode
from pydantic import BaseModel
from .basic_llm import ModelName


class StructuredOutputNodeConfig(BaseModel):
    llm_name: ModelName
    max_tokens: int
    temperature: float
    system_prompt: str
    output_schema: Dict[str, str]
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class StructuredOutputNodeInput(BaseModel):
    user_message: str


class StructuredOutputNodeOutput(BaseModel):
    pass


class StructuredOutputNode(BaseNode):
    """
    Node type for calling an LLM with structured output.
    """

    name = "structured_output_llm_node"
    config_model = StructuredOutputNodeConfig
    input_model = StructuredOutputNodeInput
    output_model = StructuredOutputNodeOutput

    def setup(self) -> None:
        self.input_model = StructuredOutputNodeInput
        self.output_model = self.get_model_for_schema_dict(
            self.config.output_schema, "StructuredOutputNodeOutput"
        )

    async def run(self, input_data: StructuredOutputNodeInput) -> BaseModel:
        system_message = self.config.system_prompt
        output_schema = self.config.output_schema
        system_message += (
            f"\nMake sure the output follows this JSON schema: {output_schema}"
        )
        messages = create_messages(
            system_message=system_message,
            user_message=input_data.user_message,
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
        structured_output_llm_node = StructuredOutputNode(
            config=StructuredOutputNodeConfig(
                llm_name=ModelName.GPT_4O_MINI,
                max_tokens=32,
                temperature=0.1,
                system_prompt="This is a test prompt.",
                output_schema={"response": "str"},
            )
        )
        structured_input = StructuredOutputNodeInput(
            user_message="This is a test message."
        )
        structured_output = await structured_output_llm_node(structured_input)
        print(structured_output)
        print("-" * 50)

    import asyncio

    asyncio.run(test_llm_nodes())
