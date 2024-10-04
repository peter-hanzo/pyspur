import json
from re import A, T
from typing import Any, Dict
from venv import create
from click import INT

from regex import D, E
from .llm_utils import create_messages, generate_text
from .base import BaseNodeType
from pydantic import BaseModel, FilePath
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
    json_mode: bool
    system_prompt: str


class BasicLLMNodeInput(BaseModel):
    user_message: str


class BasicLLMNodeOutput(BaseModel):
    assistant_message: str


class BasicLLMNodeType(
    BaseNodeType[BasicLLMNodeConfig, BasicLLMNodeInput, BasicLLMNodeOutput]
):
    """
    Basic node type for calling an LLM.
    """

    name = "basic_llm_node"

    def __init__(self, config: BasicLLMNodeConfig) -> None:
        self.config = config

    async def __call__(self, input_data: BasicLLMNodeInput) -> BasicLLMNodeOutput:
        messages = create_messages(
            system_message=self.config.system_prompt,
            user_message=input_data.user_message,
        )
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_name,
            temperature=self.config.temperature,
            json_mode=self.config.json_mode,
        )
        return BasicLLMNodeOutput(assistant_message=assistant_message)


class LLMStructuredOutputValueType(str, Enum):
    INT = "int"
    FLOAT = "float"
    STR = "str"
    BOOL = "bool"


class StructuredOutputLLMNodeConfig(BaseModel):
    llm_name: ModelName
    max_tokens: int
    temperature: float
    system_prompt: str
    output_keys_and_types: Dict[str, LLMStructuredOutputValueType]


class StructuredOutputLLMNodeInput(BaseModel):
    user_message: str


class StructuredOutputLLMNodeOutput(BaseModel):
    assistant_message: Dict[str, Any]


class StructuredOutputLLMNodeType(
    BaseNodeType[
        StructuredOutputLLMNodeConfig,
        StructuredOutputLLMNodeInput,
        StructuredOutputLLMNodeOutput,
    ]
):
    """
    Node type for calling an LLM with structured output.
    """

    name = "structured_output_llm_node"

    def __init__(self, config: StructuredOutputLLMNodeConfig) -> None:
        self.config = StructuredOutputLLMNodeConfig.model_validate(config.model_dump())

    async def __call__(
        self, input_data: StructuredOutputLLMNodeInput
    ) -> StructuredOutputLLMNodeOutput:
        messages = create_messages(
            system_message=self.config.system_prompt,
            user_message=input_data.user_message,
        )
        print("config", self.config.model_json_schema())
        assistant_message = await generate_text(
            messages=messages,
            model_name=self.config.llm_name,
            temperature=self.config.temperature,
            json_mode=True,
        )
        assistant_message = json.loads(assistant_message)
        # ensure the output keys and types are correct
        for key, value_type in self.config.output_keys_and_types.items():
            if key not in assistant_message:
                raise ValueError(f"Key {key} not found in assistant message.")
            if value_type == LLMStructuredOutputValueType.INT:
                assistant_message[key] = int(assistant_message[key])
            elif value_type == LLMStructuredOutputValueType.FLOAT:
                assistant_message[key] = float(assistant_message[key])
            elif value_type == LLMStructuredOutputValueType.BOOL:
                assistant_message[key] = bool(assistant_message[key])
            elif value_type == LLMStructuredOutputValueType.STR:
                assistant_message[key] = str(assistant_message[key])
            else:
                raise ValueError(f"Invalid value type: {value_type}")
        return StructuredOutputLLMNodeOutput(assistant_message=assistant_message)
