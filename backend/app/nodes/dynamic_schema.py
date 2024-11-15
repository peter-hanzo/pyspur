from abc import ABC
from typing import Dict

from .base import BaseNode
from pydantic import BaseModel


class DynamicSchemaNodeConfig(BaseModel):
    """Configuration for nodes with dynamic input/output schemas."""

    input_schema: Dict[str, str]
    output_schema: Dict[str, str] = {"response": "str"}


class DynamicSchemaNode(BaseNode, ABC):
    """Base class for nodes with dynamic input/output schemas."""

    def setup(self) -> None:
        """Set up dynamic input/output models based on configuration."""
        # check if the config is an instance of DynamicSchemaNodeConfig
        if not isinstance(self.config, DynamicSchemaNodeConfig):
            raise ValueError(f"Invalid configuration for {self.name}: {self.config}")
        self.input_model = self.get_model_for_schema_dict(
            schema=self.config.input_schema,
            schema_name=f"{self.name}Input",
        )

        self.output_model = self.get_model_for_schema_dict(
            schema=self.config.output_schema,
            schema_name=f"{self.name}Output",
        )
