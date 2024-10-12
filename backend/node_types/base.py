from abc import ABC, abstractmethod
from enum import Enum
from pydantic import BaseModel
from typing import ClassVar, Generic, Type, TypeVar, get_args, get_origin, List

ConfigType = TypeVar("ConfigType", bound=BaseModel)
InputType = TypeVar("InputType", bound=BaseModel)
OutputType = TypeVar("OutputType", bound=BaseModel)


DynamicSchemaValueType = str


class BaseNodeType(Generic[ConfigType, InputType, OutputType], ABC):
    """
    Base class for all node types.
    """

    name: str

    ConfigType: Type[BaseModel]
    InputType: Type[BaseModel]
    OutputType: Type[BaseModel]

    @abstractmethod
    def __init__(self, config: BaseModel) -> None:
        pass

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        if not hasattr(cls, "name"):
            raise NotImplementedError("Node type must define a 'name' property")
        for base in getattr(cls, "__orig_bases__", []):
            origin = get_origin(base)
            if origin is BaseNodeType:
                type_args = get_args(base)
                if len(type_args) == 3:
                    cls.ConfigType, cls.InputType, cls.OutputType = type_args
                else:
                    raise TypeError(f"Expected 3 type arguments, got {len(type_args)}")
                break
        else:
            raise TypeError(
                "Generic type parameters not specified for BaseNodeType subclass."
            )

    @abstractmethod
    async def __call__(self, input_data: BaseModel) -> BaseModel:
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
        Supports arbitrarily nested types like 'int', 'list[int]', 'list[list[int]]', etc.
        """
        from typing import List

        def parse_type(s: str) -> Type:
            s = s.strip()
            if s.startswith('list[') and s.endswith(']'):
                inner_type_str = s[5:-1]
                inner_type = parse_type(inner_type_str)
                return List[inner_type]
            elif s == 'int':
                return int
            elif s == 'float':
                return float
            elif s == 'str':
                return str
            elif s == 'bool':
                return bool
            else:
                raise ValueError(f"Unsupported type: {s}")

        return parse_type(value_type)
