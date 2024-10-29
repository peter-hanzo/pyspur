from typing import Dict

from pydantic import BaseModel

from ..base import BaseNode, DynamicSchemaValueType


class PythonFuncNodeConfig(BaseModel):
    code: str  # The Python code to execute
    input_schema: Dict[str, DynamicSchemaValueType]  # The input schema
    output_schema: Dict[str, DynamicSchemaValueType]  # The output schema


class PythonFuncNodeInput(BaseModel):
    pass


class PythonFuncNodeOutput(BaseModel):
    pass


class PythonFuncNode(BaseNode):
    """
    Node type for executing Python code on the input data.
    """

    name = "python_func_node"
    config_model = PythonFuncNodeConfig
    input_model = PythonFuncNodeInput
    output_model = PythonFuncNodeOutput

    def setup(self) -> None:
        self.input_model = self.get_model_for_schema_dict(
            self.config.input_schema, "PythonFuncNodeInput"
        )
        self.output_model = self.get_model_for_schema_dict(
            self.config.output_schema, "PythonFuncNodeOutput"
        )

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Prepare the execution environment
        exec_globals = {}
        print("input_data", input_data.model_dump())
        exec_locals = {"input_data": input_data.model_dump()}

        # Execute the user-defined code
        exec(self.config.code, exec_globals, exec_locals)

        # Retrieve the output data
        output_data = exec_locals.get("output_data")
        if output_data is None:
            raise ValueError("Output data not found in the execution environment")
        return self.output_model.model_validate(output_data)
