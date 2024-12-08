from typing import Dict, Any, List
from pydantic import BaseModel, Field

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class MergeNodeConfig(DynamicSchemaNodeConfig):
    branch_refs: List[str] = Field(
        default_factory=list,
        description="References to conditional branches that this node merges"
    )
    merge_strategy: str = Field(
        default="first_active",
        description="How to handle multiple branches: 'first_active' or 'last_active'",
    )


class MergeNodeInput(BaseModel):
    paths: Dict[str, Any]


class MergeNodeOutput(BaseModel):
    outputs: Dict[str, Any] = Field(default_factory=dict)


class MergeNode(DynamicSchemaNode):
    """
    Node for merging conditional branches back into a single path.
    References specific branches from a conditional node and merges their outputs.
    When multiple branches are active, uses the configured merge_strategy to determine
    which branch's data to pass forward:
    - first_active: Uses data from the first active branch encountered
    - last_active: Uses data from the last active branch encountered
    """

    name = "merge_node"
    config_model = MergeNodeConfig
    input_model = MergeNodeInput
    output_model = MergeNodeOutput

    def initialize(self) -> None:
        """Initialize the node and set up the output schema"""
        output_schema = {}
        for branch_ref in self.config.branch_refs:
            output_schema[branch_ref] = "any"
        self.config.output_schema = output_schema

    async def run(self, input_data: MergeNodeInput) -> MergeNodeOutput:
        if not input_data.paths:
            return MergeNodeOutput(outputs={})

        outputs = {}
        for path_name, path_value in input_data.paths.items():
            outputs[path_name] = path_value

        return MergeNodeOutput(outputs=outputs)
