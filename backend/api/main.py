from fastapi import FastAPI
from backend.nodes.registry import node_registry
from pydantic import schema_json_of
from typing import Dict, Any

app = FastAPI()

@app.get("/nodes")
def get_nodes() -> Dict[str, Dict[str, Any]]:
    """
    Returns the schemas for all available nodes.
    """
    nodes = node_registry.get_nodes()
    node_schemas = {}
    for name, details in nodes.items():
        node_schemas[name] = {
            "input_schema": schema_json_of(details["input_schema"]),
            "output_schema": schema_json_of(details["output_schema"]),
            "config_schema": schema_json_of(details["config_schema"])
        }
    return node_schemas

