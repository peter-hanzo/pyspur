from typing import Dict, Any
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class MergeNodeConfig(DynamicSchemaNodeConfig):
    input_schemas: Dict[str, Dict[str, str]]  # Schema for each input path


class MergeNodeInput(BaseModel):
    paths: Dict[str, Any]


class MergeNodeOutput(BaseModel):
    result: Any


class MergeNode(DynamicSchemaNode):
    """
    Node for merging multiple execution paths.
    Acts as a passthrough for the active branch's data, since only one branch
    will be active during runtime.
    """

    name = "merge_node"
    config_model = MergeNodeConfig
    input_model = MergeNodeInput
    output_model = MergeNodeOutput

    async def run(self, input_data: MergeNodeInput) -> BaseModel:
        # Get the data from the active branch (there should only be one)
        active_path_data = next(iter(input_data.paths.values()))
        return self.output_model(result=active_path_data)
