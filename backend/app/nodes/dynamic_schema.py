from abc import ABC
from typing import List, Type

from .base import BaseNode, SchemaField, SuportedSchemaTypesEnum
from pydantic import BaseModel


class DynamicSchemaNodeConfig(BaseModel):
    """Configuration for nodes with dynamic input/output schemas."""

    input_schema: List[SchemaField]
    output_schema: List[SchemaField] = [
        SchemaField(
            field_name="assistant_message", field_type=SuportedSchemaTypesEnum.str
        )
    ]


class DynamicSchemaNode(BaseNode, ABC):
    """Base class for nodes with dynamic input/output schemas."""

    def get_model_for_schema(
        self, schema: List[SchemaField], schema_name: str
    ) -> Type[BaseModel]:
        """Create a Pydantic model for a schema."""
        schema_dict = {field.field_name: field.field_type.value for field in schema}
        return self.get_model_for_schema_dict(schema_dict, schema_name)

    def setup(self) -> None:
        """Set up dynamic input/output models based on configuration."""
        # check if the config is an instance of DynamicSchemaNodeConfig
        if not isinstance(self.config, DynamicSchemaNodeConfig):
            raise ValueError(f"Invalid configuration for {self.name}: {self.config}")

        self.input_model = self.get_model_for_schema(
            schema=self.config.input_schema, schema_name=f"{self.name}Input"
        )

        self.output_model = self.get_model_for_schema(
            schema=self.config.output_schema, schema_name=f"{self.name}Output"
        )
