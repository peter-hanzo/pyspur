from typing import Any, Dict, Type
from pydantic import BaseModel, create_model
from .base import BaseNodeType, DynamicSchemaValueType


class PythonFuncNodeConfig(BaseModel):
    code: str  # The Python code to execute
    input_schema: Dict[str, DynamicSchemaValueType]  # The input schema
    output_schema: Dict[str, DynamicSchemaValueType]  # The output schema


class PythonFuncNodeInput(BaseModel):
    pass


class PythonFuncNodeOutput(BaseModel):
    pass


class PythonFuncNodeType(
    BaseNodeType[PythonFuncNodeConfig, PythonFuncNodeInput, PythonFuncNodeOutput]
):
    """
    Node type for executing Python code on the input data.
    """

    name = "python_func_node"

    def __init__(self, config: PythonFuncNodeConfig) -> None:
        self.config = config
        input_schema = config.input_schema
        input_schema = {k: self._get_python_type(v) for k, v in input_schema.items()}
        input_schema = {k: (v, ...) for k, v in input_schema.items()}
        self.input_model = create_model(
            "PythonFuncNodeInput",
            **input_schema,  # type: ignore
            __base__=BaseModel,
        )
        output_schema = config.output_schema
        output_schema = {k: self._get_python_type(v) for k, v in output_schema.items()}
        output_schema = {k: (v, ...) for k, v in output_schema.items()}
        self.output_model = create_model(
            "PythonFuncNodeOutput",
            **output_schema,  # type: ignore
            __base__=BaseModel,
        )
        self.InputType = self.input_model
        self.OutputType = self.output_model

    async def __call__(self, input_data: PythonFuncNodeInput) -> PythonFuncNodeOutput:
        # Prepare the execution environment
        exec_globals = {}
        print("input_data", input_data.model_dump())
        exec_locals = {"input_data": input_data.model_dump()}

        # Execute the user-defined code
        exec(self.config.code, exec_globals, exec_locals)

        # Retrieve the output data
        output_data = exec_locals.get("output_data")
        return self.output_model(**output_data)
