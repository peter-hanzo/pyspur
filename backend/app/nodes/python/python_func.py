from typing import Dict, Any

from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class PythonFuncNodeConfig(DynamicSchemaNodeConfig):
    input_schema: Dict[str, str] = {}
    code: str = "\n".join(
        [
            "# Write your Python code here.",
            "# All the inputs to the node will be available as local variables.",
            "# The output will be the local variables that are also in the output schema.",
        ]
    )


class PythonFuncNodeInput(BaseModel):
    pass


class PythonFuncNodeOutput(BaseModel):
    pass


class PythonFuncNode(DynamicSchemaNode):
    """Node type for executing Python functions."""

    name = "python_func_node"
    display_name = "Python Function"
    config_model = PythonFuncNodeConfig
    input_model = PythonFuncNodeInput
    output_model = PythonFuncNodeOutput

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Prepare the execution environment
        exec_globals: Dict[str, Any] = {}
        print("input_data", input_data.model_dump())
        exec_locals = input_data.model_dump()

        # Execute the user-defined code
        exec(self.config.code, exec_globals, exec_locals)

        # Retrieve the output data, select all keys that are also in the output schema
        output_data = {
            key: value
            for key, value in exec_locals.items()
            if key in self.config.output_schema
        }
        return self.output_model.model_validate(output_data)
