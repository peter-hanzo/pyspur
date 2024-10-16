from abc import ABC, abstractmethod
from enum import Enum
from pydantic import BaseModel, create_model
from typing import (
    ClassVar,
    Generic,
    Tuple,
    Type,
    TypeVar,
    get_args,
    get_origin,
    List,
    Dict,
    Any,
)

TConfig = TypeVar("TConfig", bound=BaseModel)
TInput = TypeVar("TInput", bound=BaseModel)
TOutput = TypeVar("TOutput", bound=BaseModel)


DynamicSchemaValueType = str


class BaseNode(Generic[TConfig, TInput, TOutput], ABC):
    """
    Base class for all nodes.
    """

    name: str

    config_model: TConfig
    input_model: TInput
    output_model: TOutput

    @abstractmethod
    def __init__(self, config: BaseModel) -> None:
        pass

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        if not hasattr(cls, "name"):
            raise NotImplementedError("Node type must define a 'name' property")
        for base in getattr(cls, "__orig_bases__", []):
            origin = get_origin(base)
            if origin is BaseNode:
                type_args = get_args(base)
                if len(type_args) == 3:
                    cls.config_model = type_args[0]
                    cls.input_model = type_args[1]
                    cls.output_model = type_args[2]
                else:
                    raise TypeError(f"Expected 3 type arguments, got {len(type_args)}")
                break
        else:
            raise TypeError(
                "Generic type parameters not specified for BaseNode subclass."
            )

    @abstractmethod
    async def __call__(self, input_data: TInput) -> TOutput:
        """
        Execute the node with the given input data.

        Args:
            input_data (BaseModel): Pydantic model containing input data.

        Returns:
            BaseModel: Pydantic model containing output data.
        """
        pass

    @staticmethod
    def _get_python_type(value_type: DynamicSchemaValueType) -> Type:
        """
        Parse the value_type string into an actual Python type.
        Supports arbitrarily nested types like 'int', 'list[int]', 'dict[str, int]', 'list[dict[str, list[int]]]', etc.
        """
        from typing import List, Dict, Any, Type

        def parse_type(s: str) -> Type[Any]:
            s = s.strip().lower()
            if s in ("int", "float", "str", "bool"):
                return {"int": int, "float": float, "str": str, "bool": bool}[s]
            elif s == "dict":
                return dict
            elif s == "list":
                return list
            elif s.startswith("list[") and s.endswith("]"):
                inner_type_str = s[5:-1]
                inner_type = parse_type(inner_type_str)
                return List[inner_type]
            elif s.startswith("dict[") and s.endswith("]"):
                inner_types_str = s[5:-1]
                key_type_str, value_type_str = split_types(inner_types_str)
                key_type = parse_type(key_type_str)
                value_type = parse_type(value_type_str)
                return Dict[key_type, value_type]
            else:
                raise ValueError(f"Unsupported type: {s}")

        def split_types(s: str) -> Tuple[str, str]:
            """
            Splits the string s at the top-level comma, correctly handling nested brackets.
            """
            depth = 0
            start = 0
            splits = []
            for i, c in enumerate(s):
                if c == "[":
                    depth += 1
                elif c == "]":
                    depth -= 1
                elif c == "," and depth == 0:
                    splits.append(s[start:i].strip())
                    start = i + 1
            splits.append(s[start:].strip())
            if len(splits) != 2:
                raise ValueError(f"Invalid dict type specification: {s}")
            return splits[0], splits[1]

        return parse_type(value_type)

    def _get_model_for_schema_dict(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str, base_model
    ):
        """
        Create a Pydantic model from a schema dictionary.
        """
        schema = {k: self._get_python_type(v) for k, v in schema.items()}
        schema_type_dict = {k: (v, ...) for k, v in schema.items()}
        return create_model(
            schema_name,
            **schema_type_dict,  # type: ignore
            __base__=base_model,
        )

    def _get_input_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> TInput:
        return self._get_model_for_schema_dict(schema, schema_name, self.input_model)

    def _get_output_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> TOutput:
        return self._get_model_for_schema_dict(schema, schema_name, self.output_model)

    def _get_config_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> TConfig:
        return self._get_model_for_schema_dict(schema, schema_name, self.config_model)
