from abc import ABC, abstractmethod
from pydantic import BaseModel, create_model
from typing import (
    Any,
    Type,
    Union,
    Generic,
    Tuple,
    TypeVar,
    get_args,
    get_origin,
    Dict,
    List,
    cast,
)

ConfigSchema = TypeVar("ConfigSchema", bound=BaseModel)
InputSchema = TypeVar("InputSchema", bound=BaseModel)
OutputSchema = TypeVar("OutputSchema", bound=BaseModel)

DynamicSchemaValueType = str
TSchemaValue = Type[
    Union[int, float, str, bool, List[Any], Dict[Any, Any], Tuple[Any, ...]]
]


class BaseNode(Generic[ConfigSchema, InputSchema, OutputSchema], ABC):
    """
    Base class for all nodes.
    """

    name: str

    config_model: ConfigSchema
    input_model: InputSchema
    output_model: OutputSchema

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
    async def __call__(self, input_data: InputSchema) -> OutputSchema:
        """
        Execute the node with the given input data.

        Args:
            input_data (BaseModel): Pydantic model containing input data.

        Returns:
            BaseModel: Pydantic model containing output data.
        """
        pass

    @staticmethod
    def _get_python_type(
        value_type: DynamicSchemaValueType,
    ) -> Type[Union[int, float, str, bool, List[Any], Dict[Any, Any], Tuple[Any, ...]]]:
        """
        Parse the value_type string into an actual Python type.
        Supports arbitrarily nested types like 'int', 'list[int]', 'dict[str, int]', 'list[dict[str, list[int]]]', etc.
        """

        def parse_type(
            s: str,
        ) -> TSchemaValue:
            s = s.strip().lower()
            if s == "int":
                return int
            elif s in ("int", "float", "str", "bool"):
                return {"int": int, "float": float, "str": str, "bool": bool}[s]
            elif s == "dict":
                return Dict[Any, Any]
            elif s == "list":
                return List[Any]
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
            splits: List[str] = []
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
        self,
        schema: Dict[str, DynamicSchemaValueType],
        schema_name: str,
        base_model: Type[BaseModel],
    ) -> Type[BaseModel]:
        """
        Create a Pydantic model from a schema dictionary.
        """
        schema_processed = {k: self._get_python_type(v) for k, v in schema.items()}
        schema_type_dict = {k: (v, ...) for k, v in schema_processed.items()}
        return create_model(
            schema_name,
            **schema_type_dict,  # type: ignore
            __base__=base_model,
        )

    def _get_input_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> InputSchema:
        return cast(
            InputSchema,
            self._get_model_for_schema_dict(schema, schema_name, BaseModel),
        )

    def _get_output_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> OutputSchema:
        return cast(
            OutputSchema,
            self._get_model_for_schema_dict(schema, schema_name, BaseModel),
        )

    def _get_config_model(
        self, schema: Dict[str, DynamicSchemaValueType], schema_name: str
    ) -> ConfigSchema:
        return cast(
            ConfigSchema,
            self._get_model_for_schema_dict(schema, schema_name, BaseModel),
        )
