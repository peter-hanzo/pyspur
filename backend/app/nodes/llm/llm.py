import json
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel
from .llm_utils import create_messages, generate_text
from ..base import BaseNode
from ..dynamic_schema import DynamicSchemaNode
from pydantic import BaseModel
from enum import Enum


class ModelName(str, Enum):
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4O = "gpt-4o"
    O1_PREVIEW = "o1-preview"
    O1_MINI = "o1-mini"
    GPT_4_TURBO = "gpt-4-turbo"


class BasicLLMNodeConfig(BaseModel):
    llm_name: ModelName
    max_tokens: int
    temperature: float
    system_prompt: str
    json_mode: bool = False
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class BasicLLMNodeInput(BaseModel):
    user_message: str


class BasicLLMNodeOutput(BaseModel):
    assistant_message: str


class BasicLLMNode(BaseNode):
    """
    Basic node type for calling an LLM.
    """

    name = "basic_llm_node"
    config_model = BasicLLMNodeConfig

    def setup(self) -> None:
        self.input_model = BasicLLMNodeInput
        self.output_model = BasicLLMNodeOutput

    async def run(self, input_data: BasicLLMNodeInput) -> BasicLLMNodeOutput:
        system_message = self.config.system_prompt
        messages = create_messages(
            system_message=system_message,
            user_message=input_data.user_message,
            few_shot_examples=self.config.few_shot_examples,  # Pass examples here
        )
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_name,
            temperature=self.config.temperature,
            json_mode=self.config.json_mode,
        )
        return BasicLLMNodeOutput(assistant_message=assistant_message)


class StructuredOutputLLMNodeConfig(BaseModel):
    llm_name: ModelName
    max_tokens: int
    temperature: float
    system_prompt: str
    output_schema: Dict[str, str]
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class StructuredOutputLLMNodeInput(BaseModel):
    user_message: str


class StructuredOutputLLMNodeOutput(BaseModel):
    pass


class StructuredOutputLLMNode(BaseNode):
    """
    Node type for calling an LLM with structured output.
    """

    name = "structured_output_llm_node"
    config_model = StructuredOutputLLMNodeConfig

    def setup(self) -> None:
        self.input_model = StructuredOutputLLMNodeInput
        self.output_model = self.get_model_for_schema_dict(
            self.config.output_schema, "StructuredOutputLLMNodeOutput"
        )

    async def run(self, input_data: StructuredOutputLLMNodeInput) -> BaseModel:
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


class AdvancedLLMNodeConfig(BaseModel):
    llm_name: ModelName
    max_tokens: int
    temperature: float
    system_prompt: str
    output_schema: Dict[str, str]
    input_schema: Dict[str, str] = {"user_message": "str"}
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class AdvancedLLMNode(DynamicSchemaNode):
    """
    Node type for calling an LLM with structured i/o and support for params in system prompt and user_input.
    """

    name = "advanced_llm_node"
    config_model = AdvancedLLMNodeConfig

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
        basic_llm_node = BasicLLMNode(
            config=BasicLLMNodeConfig(
                llm_name=ModelName.GPT_4O_MINI,
                max_tokens=32,
                temperature=0.1,
                json_mode=False,
                system_prompt="This is a test prompt.",
            )
        )
        basic_input = BasicLLMNodeInput(user_message="This is a test message.")
        basic_output = await basic_llm_node(basic_input)
        print(basic_output)
        print("-" * 50)

        structured_output_llm_node = StructuredOutputLLMNode(
            config=StructuredOutputLLMNodeConfig(
                llm_name=ModelName.GPT_4O_MINI,
                max_tokens=32,
                temperature=0.1,
                system_prompt="This is a test prompt.",
                output_schema={"response": "str"},
            )
        )
        structured_input = StructuredOutputLLMNodeInput(
            user_message="This is a test message."
        )
        structured_output = await structured_output_llm_node(structured_input)
        print(structured_output)
        print("-" * 50)

        advanced_llm_node = AdvancedLLMNode(
            config=AdvancedLLMNodeConfig(
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
