import json
import re
from textwrap import indent
from typing import Optional

OPENAPI_JSON_PATH = "openapi.json"
OUTPUT_NODE_FILE = "my_api_node.py"


def snake_case(s: str) -> str:
    """
    Convert a string to snake_case for Python variable/class naming.
    """
    s = re.sub(r'([A-Z]+)', r'_\1', s)
    s = re.sub(r'[^0-9a-zA-Z_]', '_', s)
    return s.lower().strip('_')


def parse_openapi(openapi_json_path: str):
    """
    Parses the OpenAPI JSON file and returns the loaded dictionary.
    """
    with open(openapi_json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_config_fields_from_parameters(parameters: list) -> str:
    """
    Instead of placing parameters in the Node's Input model,
    we put them in the Config as <param>_template fields.
    """
    config_fields = []
    for param in parameters:
        param_name = param["name"]
        desc = param.get("description", "").replace('"', '\\"')
        required = param.get("required", False)

        # We'll store them all as str (templates).
        # If not required, use Optional[str].
        # e.g. limit_template: Optional[str] = Field(None, ...)
        if required:
            field_code = (
                f'{snake_case(param_name)}_template: str = '
                f'Field(..., description="{desc} (Template for {param_name})")'
            )
        else:
            field_code = (
                f'{snake_case(param_name)}_template: Optional[str] = '
                f'Field(None, description="{desc} (Template for {param_name})")'
            )
        config_fields.append(field_code)

    if not config_fields:
        config_fields = ["# No parameters found for config"]

    return "\n".join(config_fields)


def generate_classes_for_path_operation(path: str, method: str, operation: dict, components: dict) -> str:
    """
    Generate:
      1. Output class
      2. Config class with <param>_template fields
    We skip an explicit Input class, as parameters are in the config (dynamic).
    """

    operation_id = operation.get("operationId", f"{method}_{path}")
    # Convert operation ID to PascalCase
    class_base_name = "".join(word.capitalize() for word in snake_case(operation_id).split("_"))
    output_class_name = f"{class_base_name}Output"
    config_class_name = f"{class_base_name}Config"

    # Gather parameters from the operation
    parameters = operation.get("parameters", [])

    # Generate config fields from parameters
    config_fields_code = generate_config_fields_from_parameters(parameters)

    # Output class code
    output_class_code = f'''\
class {output_class_name}(BaseNodeOutput):
    """
    Output for {operation_id}.
    """
    response_data: str = Field(..., description="Stringified data from the {operation_id} response.")
'''

    # Config class code
    config_class_code = f'''\
class {config_class_name}(BaseNodeConfig):
    """
    Configuration for {operation_id}.
    """
    base_url: str = Field(..., description="Base URL for the API.")
    endpoint_path: str = Field("{path}", description="Endpoint path for the {operation_id} operation.")

{indent(config_fields_code, "    ")}

    has_fixed_output: bool = True
    output_json_schema: str = Field(
        default=json.dumps({output_class_name}.model_json_schema()),
        description="The JSON schema for the output of the node"
    )
'''

    return "\n\n".join([output_class_code, config_class_code])


def generate_node_class(path: str, method: str, operation: dict) -> str:
    """
    Generate the Node class for the specified operation.  
    We'll do a minimal approach: if method == GET, we pass query params; 
    otherwise, we pass JSON body for the parameters.
    """
    operation_id = operation.get("operationId", f"{method}_{path}")
    class_base_name = "".join(word.capitalize() for word in snake_case(operation_id).split("_"))
    output_class_name = f"{class_base_name}Output"
    config_class_name = f"{class_base_name}Config"
    node_class_name = f"{class_base_name}Node"

    parameters = operation.get("parameters", [])

    # Build code snippet that:
    #   1) Renders each <param>_template 
    #   2) Converts to correct type if int/bool
    # e.g.:
    #     limit_str = render_template_or_get_first_string(self.config.limit_template, raw_input_dict, self.name)
    #     limit = int(limit_str) if limit_str else None
    param_handling_code = []
    for param in parameters:
        param_name = param["name"]
        schema = param.get("schema", {})
        python_name = snake_case(param_name)
        var_str_name = f"{python_name}_str"

        line1 = (
            f'{var_str_name} = render_template_or_get_first_string('
            f'self.config.{python_name}_template, raw_input_dict, self.name)'
        )

        if schema.get("type") == "integer":
            line2 = f'{python_name} = int({var_str_name}) if {var_str_name} else None'
        elif schema.get("type") == "boolean":
            # e.g. check if the string is "true"
            line2 = f'{python_name} = ({var_str_name}.lower() == "true") if {var_str_name} else None'
        else:
            line2 = f'{python_name} = {var_str_name}'
        param_handling_code.extend([line1, line2])

    param_handling_code_str = "\n".join("            " + line for line in param_handling_code)

    # Build the request snippet: If GET => query params, else => JSON body
    get_params = []
    post_params = []
    for param in parameters:
        py_name = snake_case(param["name"])
        get_params.append(f'if {py_name} is not None: params["{param["name"]}"] = {py_name}')
        post_params.append(f'if {py_name} is not None: payload["{param["name"]}"] = {py_name}')

    get_params_code = "\n".join("                " + ln for ln in get_params)
    post_params_code = "\n".join("                " + ln for ln in post_params)

    node_code = f'''\
@NodeRegistry.register(
    category="Integrations",
    display_name="{class_base_name} Node",
    logo="/images/default_logo.png",
    subcategory="OpenAPI Services",
)
class {node_class_name}(BaseNode):
    """
    Node calling operationId: {operation_id}.
    """

    name = "{snake_case(operation_id)}_node"
    config_model = {config_class_name}
    # We don't need a specialized input model,
    # because parameters are handled via <param>_template in config.
    input_model = BaseNodeInput
    output_model = {output_class_name}
    category = "MyAPI"  # Adjust as needed

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            from ...utils.template_utils import render_template_or_get_first_string
            import requests
            import logging

            raw_input_dict = input.model_dump()
            config = self.config

            # Construct the full URL
            full_url = f"{{config.base_url}}{{config.endpoint_path}}"

{param_handling_code_str if param_handling_code_str else "            # No parameters to handle"}

            headers = {{
                "Content-Type": "application/json"
            }}

            if "{method.upper()}" == "GET":
                # Use query params
                params = {{}}
{get_params_code}
                response = requests.get(full_url, headers=headers, params=params, timeout=30)
            else:
                # Use JSON body
                payload = {{}}
{post_params_code}
                response = requests.{method.lower()}(full_url, headers=headers, json=payload, timeout=30)

            response.raise_for_status()
            data = response.json()

            return {output_class_name}(response_data=json.dumps(data))

        except Exception as e:
            logging.error(f"Failed to call {operation_id}: {{e}}")
            return {output_class_name}(response_data="")
'''

    return node_code


def main():
    openapi_dict = parse_openapi(OPENAPI_JSON_PATH)
    paths = openapi_dict.get("paths", {})
    components = openapi_dict.get("components", {})

    # For demonstration, pick the first path & first method in the spec.
    chosen_path = None
    chosen_method = None
    chosen_operation = None

    for p, path_item in paths.items():
        for m, operation_obj in path_item.items():
            chosen_path = p
            chosen_method = m
            chosen_operation = operation_obj
            break
        if chosen_path:
            break

    if not chosen_path or not chosen_operation:
        raise ValueError("No valid path/method found in the OpenAPI spec.")

    # Generate the Output & Config
    classes_code = generate_classes_for_path_operation(
        chosen_path,
        chosen_method,
        chosen_operation,
        components
    )

    # Generate the Node class
    node_class_code = generate_node_class(
        chosen_path, 
        chosen_method, 
        chosen_operation
    )

    # Compose the final Python file content
    file_content = f'''\
import json
from typing import Optional  # Ensure Optional is imported
from pydantic import BaseModel, Field  # type: ignore

from ..base import (
    BaseNode,
    BaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)
from ..registry import NodeRegistry

# ---------------------------
# Dynamically Generated Classes
# ---------------------------

{classes_code}

# ---------------------------
# Dynamically Generated Node
# ---------------------------

{node_class_code}
'''

    with open(OUTPUT_NODE_FILE, "w", encoding="utf-8") as f:
        f.write(file_content)

    print(f"Generated node file: {OUTPUT_NODE_FILE}")


if __name__ == "__main__":
    main()
