from typing import Any, Dict, List, Tuple
from pydantic import Field

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class RankNodeConfig(DynamicSchemaNodeConfig):
    """Configuration for the rank node."""
    reverse: bool = Field(
        default=False,
        description="Higher values get lower ranks if True"
    )
    key_field: str = Field(
        default="",
        description="Field to rank by for complex objects. Leave empty for simple values."
    )
    input_schema: Dict[str, str] = {"items": "list[any]"}
    output_schema: Dict[str, str] = {
        "items": "list[any]",
        "ranks": "list[int]"
    }


class RankNode(DynamicSchemaNode):
    """Node that assigns ranks to items based on their values."""
    name = "rank_node"
    display_name = "Rank"
    config_model = RankNodeConfig

    async def run(self, input_data: Any) -> Any:
        """Rank items based on configuration."""
        items = input_data.items
        key_field = self.config.key_field

        def get_value(x: Any) -> Any:
            """Extract value to rank by."""
            if not key_field:
                return x
            return x.get(key_field) if isinstance(x, dict) else getattr(x, key_field, x)

        # Create list of (index, item) pairs for stable sorting
        indexed_items: List[Tuple[int, Any]] = list(enumerate(items))

        # Sort items while preserving original indices
        sorted_with_index = sorted(
            indexed_items,
            key=lambda x: get_value(x[1]),
            reverse=self.config.reverse
        )

        # Assign ranks (1-based) while preserving original order
        ranks = [0] * len(items)
        for rank, (original_index, _) in enumerate(sorted_with_index, 1):
            ranks[original_index] = rank

        return {
            "items": items,  # Original items in original order
            "ranks": ranks   # Ranks in corresponding order
        }
