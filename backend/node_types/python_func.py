from typing import Any, Dict
from pydantic import BaseModel
from .base import BaseNodeType


class PythonFuncNodeConfig(BaseModel):
    code: str  # The Python code to execute


class PythonFuncNodeInput(BaseModel):
    input_data: Dict[str, Any]


class PythonFuncNodeOutput(BaseModel):
    output_data: Any


class PythonFuncNodeType(
    BaseNodeType[PythonFuncNodeConfig, PythonFuncNodeInput, PythonFuncNodeOutput]
):
    """
    Node type for executing Python code on the input data.
    """

    name = "python_func_node"

    def __init__(self, config: PythonFuncNodeConfig) -> None:
        self.config = config

    async def __call__(self, input_data: PythonFuncNodeInput) -> PythonFuncNodeOutput:
        # Prepare the execution environment
        exec_globals = {}
        exec_locals = {"input_data": input_data.input_data, "output_data": None}

        # Execute the user-defined code
        exec(self.config.code, exec_globals, exec_locals)

        # Retrieve the output data
        output_data = exec_locals.get("output_data")
        return PythonFuncNodeOutput(output_data=output_data)
