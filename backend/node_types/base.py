from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Type


class BaseNodeType(ABC):

    name: str
    config_schema: Type[BaseModel]
    input_schema: Type[BaseModel]
    output_schema: Type[BaseModel]

    def __init__(
        self,
        config: BaseModel,
    ):
        """
        Initialize the node with a configuration object.

        Args:
            config (BaseModel): Pydantic model containing configuration parameters.
        """
        self.config = config

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        if not hasattr(cls, "name"):
            raise NotImplementedError("Node type must define a 'name' property")
        if not hasattr(cls, "config_schema"):
            raise NotImplementedError(
                "Node type must define a 'config_schema' property"
            )
        if not hasattr(cls, "input_schema"):
            raise NotImplementedError("Node type must define a 'input_schema' property")
        if not hasattr(cls, "output_schema"):
            raise NotImplementedError(
                "Node type must define a 'output_schema' property"
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
