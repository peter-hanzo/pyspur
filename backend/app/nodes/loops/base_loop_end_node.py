from typing import Dict
from pydantic import BaseModel, Field, create_model
from ..base import BaseNodeConfig, BaseNode, BaseNodeInput, BaseNodeOutput
from ...utils.pydantic_utils import get_nested_field


class LoopEndOfIterationNodeConfig(BaseNodeConfig):
    input_map: Dict[str, str] = Field(
        title="Input map",
        description="Map of this node's inputs to loop inputs expressed as Dict[<loop_input_field>, <input_variable_path>]",
    )


class LoopEndOfIterationNodeInput(BaseNodeInput):
    pass


class LoopEndOfIterationNodeOutput(BaseNodeOutput):
    pass


class LoopEndOfIterationNode(BaseNode):
    name = "loop_end_node"
    config_model = LoopEndOfIterationNodeConfig

    def setup(self) -> None:
        super().setup()

    def set_loop_input(self, input: BaseModel) -> None:
        self.loop_input = input
        self.output_model = create_model(
            f"{self.name}",
            **{
                field_name: (field_type, ...)  # type: ignore
                for field_name, field_type in self.loop_input.model_fields.items()
            },
            __base__=LoopEndOfIterationNodeOutput,
        )

    async def run(self, input: BaseModel) -> BaseModel:
        # Start with a copy of the loop input
        mapped_input = self.loop_input.model_dump()

        # Update values based on input map
        for loop_input_field, input_var_path in self.config.input_map.items():
            input_var = get_nested_field(input_var_path, input)
            # Handle nested fields using dot notation
            field_parts = loop_input_field.split(".")
            current_dict = mapped_input
            for part in field_parts[:-1]:
                if part not in current_dict:
                    current_dict[part] = {}
                current_dict = current_dict[part]
            current_dict[field_parts[-1]] = input_var

        return self.output_model.model_validate(mapped_input)
