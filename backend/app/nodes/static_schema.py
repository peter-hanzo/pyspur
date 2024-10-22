from abc import ABC
from .base import BaseNode
from pydantic import BaseModel
from typing import Type


class StaticSchemaNode(BaseNode, ABC):
    """Base class for nodes with static input/output schemas."""

    config_model: Type[BaseModel]
    input_model: Type[BaseModel]
    output_model: Type[BaseModel]

    def setup(self) -> None:
        """Ensure that input/output models are already defined."""
        if not all([self.input_model, self.output_model, self.config_model]):
            raise NotImplementedError(
                "StaticSchemaNode subclasses must define input_model, output_model, and config_model."
            )
