from typing import Any, Dict, List
from pydantic import Field

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class SortNodeConfig(DynamicSchemaNodeConfig):
    """Configuration for the sort node."""
    reverse: bool = Field(
        default=False,
        description="Sort in descending order if True"
    )
    key_field: str = Field(
        default="",
        description="Field to sort by for complex objects. Leave empty for simple values."
    )
    input_schema: Dict[str, str] = {"items": "list[any]"}
    output_schema: Dict[str, str] = {"sorted_items": "list[any]"}


class SortNode(DynamicSchemaNode):
    """Node that sorts a list of items based on configured criteria."""
    name = "sort_node"
    display_name = "Sort"
    config_model = SortNodeConfig

    async def run(self, input_data: Any) -> Any:
        """Sort items based on configuration."""
        items = input_data.items
        key_field = self.config.key_field

        def get_value(x: Any) -> Any:
            """Extract value to sort by."""
            if not key_field:
                return x
            return x.get(key_field) if isinstance(x, dict) else getattr(x, key_field, x)

        sorted_items = sorted(
            items,
            key=get_value,
            reverse=self.config.reverse
        )
        return {"sorted_items": sorted_items}
