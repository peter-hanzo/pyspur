import json
from enum import Enum
from re import A, S, T
from typing import Any, Dict, List, Optional
from venv import create

from attr import validate
from click import INT
from pydantic import BaseModel, create_model, field_validator
from regex import D, E
from .llm_utils import create_messages, generate_text
from .base import BaseNode, DynamicSchemaValueType
from pydantic import BaseModel, create_model
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
    few_shot_examples: Optional[List[Dict[str, str]]] = None


class BasicLLMNodeInput(BaseModel):
    user_message: str


class BasicLLMNodeOutput(BaseModel):
    assistant_message: str


class BasicLLMNode(BaseNode[BasicLLMNodeConfig, BasicLLMNodeInput, BasicLLMNodeOutput]):
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
            few_shot_examples=self.config.few_shot_examples,
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

    @field_validator("output_schema")
    def validate_output_schema(cls, v):
        allowed_base_types = {"int", "float", "str", "bool"}

        def is_valid_type(type_str):
            type_str = type_str.strip()
            if type_str in allowed_base_types:
                return True
            elif type_str.startswith("list[") and type_str.endswith("]"):
                inner_type = type_str[5:-1].strip()
                return is_valid_type(inner_type)
            else:
                return False

        for field_name, type_str in v.items():
            if not is_valid_type(type_str):
                raise ValueError(
                    f"Invalid type '{type_str}' for field '{field_name}'. "
                    f"Allowed types are base types and nested lists thereof."
                )
        return v


class StructuredOutputLLMNodeInput(BaseModel):
    user_message: str


class StructuredOutputLLMNodeOutput(BaseModel):
    pass


class StructuredOutputLLMNode(
    BaseNode[
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
        output_schema = config.output_schema
        output_schema = {k: self._get_python_type(v) for k, v in output_schema.items()}
        output_schema = {k: (v, ...) for k, v in output_schema.items()}
        self.output_model = create_model(
            "StructuredOutputLLMNodeOutput",
            **output_schema,  # type: ignore
            __base__=StructuredOutputLLMNodeOutput,
        )
        self.OutputType = self.output_model

    async def __call__(
        self, input_data: StructuredOutputLLMNodeInput
    ) -> StructuredOutputLLMNodeOutput:
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
        assistant_message = self.output_model(**assistant_message)
        return assistant_message
