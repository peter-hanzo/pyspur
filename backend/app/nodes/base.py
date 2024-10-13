from abc import ABC, abstractmethod
from enum import Enum
from pydantic import BaseModel
from typing import ClassVar, Generic, Type, TypeVar, get_args, get_origin

ConfigType = TypeVar("ConfigType", bound=BaseModel)
InputType = TypeVar("InputType", bound=BaseModel)
OutputType = TypeVar("OutputType", bound=BaseModel)


class DynamicSchemaValueType(str, Enum):
    INT = "int"
    FLOAT = "float"
    STR = "str"
    BOOL = "bool"


class BaseNode(Generic[ConfigType, InputType, OutputType], ABC):
    """
    Base class for all nodes.
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
            if origin is BaseNode:
                type_args = get_args(base)
                if len(type_args) == 3:
                    cls.ConfigType, cls.InputType, cls.OutputType = type_args
                else:
                    raise TypeError(f"Expected 3 type arguments, got {len(type_args)}")
                break
        else:
            raise TypeError(
                "Generic type parameters not specified for BaseNode subclass."
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
        if value_type == DynamicSchemaValueType.INT:
            return int
        elif value_type == DynamicSchemaValueType.FLOAT:
            return float
        elif value_type == DynamicSchemaValueType.STR:
            return str
        elif value_type == DynamicSchemaValueType.BOOL:
            return bool
        else:
            raise ValueError(f"Invalid value type: {value_type}")
