from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Type

class BaseNode(ABC):

    def __init__(self, config: BaseModel, input_schema: Type[BaseModel], output_schema: Type[BaseModel]):
        """
        Initialize the node with a configuration object.

        Args:
            config (BaseModel): Pydantic model containing configuration parameters.
        """
        self.config = config
        self.input_schema = input_schema
        self.output_schema = output_schema

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