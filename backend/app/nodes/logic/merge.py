from typing import Dict, Any, List
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class MergeNodeConfig(DynamicSchemaNodeConfig):
    input_schemas: Dict[str, Dict[str, str]]  # Schema for each input path
    merge_strategy: str = "concat"  # Options: concat, union, custom


class MergeNodeInput(BaseModel):
    paths: Dict[str, Any]


class MergeNodeOutput(BaseModel):
    merged_result: Any


class MergeNode(DynamicSchemaNode):
    """
    Node for merging multiple execution paths.
    Can combine data from different branches using various strategies.
    """

    name = "merge_node"
    config_model = MergeNodeConfig
    input_model = MergeNodeInput
    output_model = MergeNodeOutput

    async def run(self, input_data: MergeNodeInput) -> BaseModel:
        if self.config.merge_strategy == "concat":
            # For arrays, concatenate them
            result = []
            for path_data in input_data.paths.values():
                if isinstance(path_data, list):
                    result.extend(path_data)
                else:
                    result.append(path_data)
            return self.output_model(merged_result=result)

        elif self.config.merge_strategy == "union":
            # For dictionaries, combine them
            result = {}
            for path_data in input_data.paths.values():
                if isinstance(path_data, dict):
                    result.update(path_data)
            return self.output_model(merged_result=result)

        else:
            # Default: return all paths as is
            return self.output_model(merged_result=input_data.paths)
