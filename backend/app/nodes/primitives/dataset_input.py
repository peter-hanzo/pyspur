from pydantic import BaseModel, create_model
from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class DatasetInputNodeConfig(DynamicSchemaNodeConfig):
    pass


class DatasetInputNodeInput(BaseModel):
    pass


class DatasetInputNodeOutput(BaseModel):
    pass


class DatasetInputNode(DynamicSchemaNode):
    """
    Node for defining dataset schema and using the output as input for other nodes.
    """

    name = "input_value_node"
    config_model = DatasetInputNodeConfig
    input_model = DatasetInputNodeInput
    output_model = DatasetInputNodeOutput

    def setup(self) -> None:
        self.input_model = create_model(
            "DatasetInputNodeInput",
            **self.config.input_schema,
            __base__=BaseModel,
        )
        self.output_model = self.input_model

    async def run(self, input_data: BaseModel) -> BaseModel:
        return input_data
