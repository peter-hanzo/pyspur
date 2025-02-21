import json
import re
from pathlib import Path
from textwrap import indent
from typing import Any, Dict, List, Optional, TypedDict

OPENAPI_JSON_PATH = "openapi.json"
OUTPUT_NODE_FILE = "my_api_node.py"


def snake_case(s: str) -> str:
    """Convert a string to snake_case for Python variable/class naming."""
    s = re.sub(r"([A-Z]+)", r"_\1", s)
    s = re.sub(r"[^0-9a-zA-Z_]", "_", s)
    return s.lower().strip("_")


def parse_openapi(openapi_json_path: str):
    """Parses the OpenAPI JSON file and returns the loaded dictionary."""
    with open(openapi_json_path, "r", encoding="utf-8") as f:
        return json.load(f)


class NodeInfo(TypedDict):
    name: str
    path: str
    file_path: str


def generate_config_fields_from_parameters(parameters: List[Dict[str, Any]]) -> str:
    """Instead of placing parameters in the Node's Input model,
    we put them in the Config as <param>_template fields.
    """
    config_fields: List[str] = []
    for param in parameters:
        param_name = param["name"]
        desc = param.get("description", "").replace('"', '\\"')
        required = param.get("required", False)

        # We'll store them all as str (templates).
        # If not required, use Optional[str].
        # e.g. limit_template: Optional[str] = Field(None, ...)
        if required:
            field_code = (
                f"{snake_case(param_name)}_template: str = "
                f'Field(..., description="{desc} (Template for {param_name})")'
            )
        else:
            field_code = (
                f"{snake_case(param_name)}_template: Optional[str] = "
                f'Field(None, description="{desc} (Template for {param_name})")'
            )
        config_fields.append(field_code)

    if not config_fields:
        config_fields = ["# No parameters found for config"]

    return "\n".join(config_fields)


def generate_node_from_openapi(
    path: str,
    method: str,
    operation_id: Optional[str],
    summary: Optional[str],
    spec: Dict[str, Any],
) -> NodeInfo:
    """Generate a node file from an OpenAPI endpoint specification."""
    # Create the openapi directory if it doesn't exist
    nodes_dir = Path("pyspur/nodes/openapi")
    nodes_dir.mkdir(parents=True, exist_ok=True)

    # Generate a unique operation ID if not provided
    if not operation_id:
        operation_id = f"{method}_{path}".replace("/", "_").replace("{", "").replace("}", "")

    # Convert operation ID to PascalCase for class names
    class_base_name = "".join(word.capitalize() for word in snake_case(operation_id).split("_"))

    # Get the operation details from the spec
    path_obj = spec["paths"][path]
    operation = path_obj[method.lower()]

    # Get parameters from both path and operation level
    path_parameters = path_obj.get("parameters", [])
    operation_parameters = operation.get("parameters", [])
    all_parameters = path_parameters + operation_parameters

    # Generate the classes
    output_class_name = f"{class_base_name}Output"
    config_class_name = f"{class_base_name}Config"
    node_class_name = f"{class_base_name}Node"

    # Generate config fields from parameters
    config_fields_code = generate_config_fields_from_parameters(all_parameters)

    # Generate the node file content
    file_content = f'''import json
from typing import Optional
from pydantic import BaseModel, Field

from ..base import (
    BaseNode,
    BaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)
from ..registry import NodeRegistry

class {output_class_name}(BaseNodeOutput):
    """Output for {operation_id}."""
    response_data: str = Field(..., description="Response data from the {operation_id} operation.")

class {config_class_name}(BaseNodeConfig):
    """Configuration for {operation_id}."""
    base_url: str = Field(..., description="Base URL for the API.")
    endpoint_path: str = Field("{path}", description="Endpoint path")

{indent(config_fields_code, "    ")}

    has_fixed_output: bool = True
    output_json_schema: str = Field(
        default=json.dumps({output_class_name}.model_json_schema()),
        description="The JSON schema for the output of the node"
    )

@NodeRegistry.register(
    category="OpenAPI",
    display_name="{class_base_name}",
    logo="/images/default_logo.png",
    subcategory="API Endpoints",
)
class {node_class_name}(BaseNode):
    """Node for {summary or operation_id}."""

    name = "{snake_case(operation_id)}_node"
    config_model = {config_class_name}
    input_model = BaseNodeInput
    output_model = {output_class_name}
    category = "OpenAPI"

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            from ...utils.template_utils import render_template_or_get_first_string
            import requests
            import logging

            raw_input_dict = input.model_dump()
            config = self.config

            # Construct the full URL
            full_url = f"{{config.base_url}}{{config.endpoint_path}}"

            headers = {{
                "Content-Type": "application/json"
            }}

            # Handle parameters
            params = {{}}
            payload = {{}}

            {generate_parameter_handling_code(all_parameters)}

            # Make the request
            if "{method.upper()}" == "GET":
                response = requests.get(full_url, headers=headers, params=params, timeout=30)
            else:
                response = requests.{method.lower()}(full_url, headers=headers, json=payload, timeout=30)

            response.raise_for_status()
            data = response.json()

            return {output_class_name}(response_data=json.dumps(data))

        except Exception as e:
            logging.error(f"Failed to call {operation_id}: {{e}}")
            return {output_class_name}(response_data="")
'''

    # Save the node file
    file_path = nodes_dir / f"{snake_case(operation_id)}_node.py"
    with open(file_path, "w") as f:
        f.write(file_content)

    return {"name": node_class_name, "path": str(file_path), "file_path": str(file_path)}


def generate_parameter_handling_code(parameters: List[Dict[str, Any]]) -> str:
    """Generate code for handling parameters."""
    code_lines: List[str] = []

    for param in parameters:
        param_name = param["name"]
        python_name = snake_case(param_name)
        var_str_name = f"{python_name}_str"
        in_type = param["in"]  # 'query', 'path', 'header', etc.

        # Generate template rendering code
        code_lines.append(
            f"{var_str_name} = render_template_or_get_first_string("
            f"self.config.{python_name}_template, raw_input_dict, self.name)"
        )

        # Convert to appropriate type if specified
        schema = param.get("schema", {})
        if schema.get("type") == "integer":
            code_lines.append(f"{python_name} = int({var_str_name}) if {var_str_name} else None")
        elif schema.get("type") == "boolean":
            code_lines.append(
                f'{python_name} = ({var_str_name}.lower() == "true") if {var_str_name} else None'
            )
        else:
            code_lines.append(f"{python_name} = {var_str_name}")

        # Add to appropriate dictionary based on parameter location
        if in_type == "query":
            code_lines.append(
                f'if {python_name} is not None: params["{param_name}"] = {python_name}'
            )
        elif in_type in ["body", "formData"]:
            code_lines.append(
                f'if {python_name} is not None: payload["{param_name}"] = {python_name}'
            )

    return "\n            ".join(code_lines) if code_lines else "# No parameters to handle"


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
        chosen_path, chosen_method, chosen_operation, components
    )

    # Generate the Node class
    node_class_code = generate_node_class(chosen_path, chosen_method, chosen_operation)

    # Compose the final Python file content
    file_content = f"""\
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
"""

    with open(OUTPUT_NODE_FILE, "w", encoding="utf-8") as f:
        f.write(file_content)

    print(f"Generated node file: {OUTPUT_NODE_FILE}")


if __name__ == "__main__":
    main()
