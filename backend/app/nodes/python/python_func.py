from typing import Dict, Any

from pydantic import BaseModel

from ..base import (
    VariableOutputBaseNode,
    VariableOutputBaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)


class PythonFuncNodeConfig(VariableOutputBaseNodeConfig):
    code: str = "\n".join(
        [
            "# Write your Python code here.",
            '# The input data is available as "input" pydantic model.',
            "# The output will be the local variables that are also in the output schema.",
        ]
    )


class PythonFuncNodeInput(BaseNodeInput):
    pass


class PythonFuncNodeOutput(BaseNodeOutput):
    pass


class PythonFuncNode(VariableOutputBaseNode):
    """
    Node type for executing Python code on the input data.
    """

    name = "python_func_node"
    config_model = PythonFuncNodeConfig
    input_model = PythonFuncNodeInput
    output_model = PythonFuncNodeOutput

    def setup(self) -> None:
        return super().setup()

    async def run(self, input: BaseModel) -> BaseModel:
        # Prepare the execution environment
        exec_globals: Dict[str, Any] = {}
        exec_locals: Dict[str, Any] = {"input_model": input}

        # Execute the user-defined code
        exec(self.config.code, exec_globals, exec_locals)

        # Retrieve the output data, select all keys that are also in the output schema
        output_data = {
            key: value
            for key, value in exec_locals.items()
            if key in self.config.output_schema
        }
        return self.output_model.model_validate(output_data)


if __name__ == "__main__":
    from pydantic import BaseModel, create_model
    import asyncio

    config = PythonFuncNodeConfig(
        code="\n".join(
            [
                "# Write your Python code here.",
                '# The input data is available as "input_model" pydantic model.',
                "# The output will be the local variables that are also in the output schema.",
                "output = input_model.Input.number ** 2",
            ]
        ),
        output_schema={"output": "int"},
    )
    A = create_model(
        "Input", number=(int, ...), __base__=BaseNodeOutput
    ).model_validate({"number": 5})
    input = {"Input": A}
    node = PythonFuncNode(config=config, name="PythonFuncTest")

    output = asyncio.run(node(input))
    print(output)
