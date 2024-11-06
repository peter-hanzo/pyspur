from pydantic import BaseModel, create_model
from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class InputNodeConfig(DynamicSchemaNodeConfig):
    pass


class InputNodeInput(BaseModel):
    pass


class InputNodeOutput(BaseModel):
    pass


class InputNode(DynamicSchemaNode):
    """
    Node for defining dataset schema and using the output as input for other nodes.
    """

    name = "input_node"
    config_model = InputNodeConfig
    input_model = InputNodeInput
    output_model = InputNodeOutput

    def setup(self) -> None:
        self.input_model = create_model(
            "DatasetInputNodeInput",
            **self.config.input_schema,
            __base__=BaseModel,
        )
        self.output_model = self.input_model

    async def run(self, input_data: BaseModel) -> BaseModel:
        return input_data
