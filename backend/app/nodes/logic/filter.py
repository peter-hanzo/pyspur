from typing import Dict, Any, List
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class FilterNodeConfig(DynamicSchemaNodeConfig):
    array_schema: Dict[str, str]  # Schema for the array items
    condition_code: str = "\n".join(
        [
            "# Write your filter condition here",
            "# Return True to keep the item, False to filter it out",
            "# The current item is available as 'item'",
        ]
    )


class FilterNodeInput(BaseModel):
    array: List[Dict[str, Any]]


class FilterNodeOutput(BaseModel):
    filtered_array: List[Dict[str, Any]]


class FilterNode(DynamicSchemaNode):
    """
    Node for filtering arrays based on a condition.
    Applies the condition to each item and returns only items that match.
    """

    name = "filter_node"
    config_model = FilterNodeConfig
    input_model = FilterNodeInput
    output_model = FilterNodeOutput

    async def run(self, input_data: FilterNodeInput) -> BaseModel:
        filtered_items = []

        for item in input_data.array:
            # Prepare execution environment
            exec_globals: Dict[str, Any] = {}
            exec_locals = {"item": item}

            # Execute filter condition
            exec(self.config.condition_code, exec_globals, exec_locals)

            # Get the result (last expression value)
            if exec_locals.get("result", False):
                filtered_items.append(item)

        return self.output_model(filtered_array=filtered_items)
