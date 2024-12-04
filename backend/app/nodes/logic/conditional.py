from typing import Dict, Any
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class ConditionalNodeConfig(DynamicSchemaNodeConfig):
    condition_schema: Dict[str, str]  # Schema for the condition input
    true_branch_schema: Dict[str, str]  # Schema for true branch
    false_branch_schema: Dict[str, str]  # Schema for false branch


class ConditionalNodeInput(BaseModel):
    condition: bool
    data: Dict[str, Any]


class ConditionalNodeOutput(BaseModel):
    paths: Dict[str, Dict[str, Any]]  # Multiple paths for branching logic


class ConditionalNode(DynamicSchemaNode):
    """
    Node for implementing if-else branching logic based on a condition.
    Routes the input data to one or more paths based on the condition.
    """

    name = "conditional_node"
    config_model = ConditionalNodeConfig
    input_model = ConditionalNodeInput
    output_model = ConditionalNodeOutput

    async def run(self, input_data: ConditionalNodeInput) -> BaseModel:
        """
        Routes the input data to one or more paths based on the condition.
        """
        # Initialize paths
        paths = {}

        # Example logic for true/false paths
        if input_data.condition:
            paths["true"] = input_data.data
        else:
            paths["false"] = input_data.data

        # Add additional paths if needed (e.g., switch/case logic)
        # Example: paths["case_1"] = {...}, paths["case_2"] = {...}

        return self.output_model(paths=paths)
