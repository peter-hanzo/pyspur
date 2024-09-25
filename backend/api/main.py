import importlib
import inspect
import os
from backend.nodes.base import BaseNode
from backend.nodes import node_registry
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

@app.get("/nodes/", response_model=List[Dict[str, Any]])
async def get_nodes() -> List[Dict[str, Any]]:
    """
    Returns the schemas for all available nodes in the nodes directory.
    """
    # get the schemas for each node class
    node_schemas = []
    for node_class in node_registry.values():
        config_schema = node_class.config_schema()
        input_schema = node_class.input_schema()
        output_schema = node_class.output_schema()
        node_schemas.append({
            "name": node_class.__name__,
            "config": config_schema.schema(),
            "input": input_schema.schema(),
            "output": output_schema.schema()
        })
    return node_schemas


@app.post("/run_node/", response_model=BaseModel)
async def run_node(node_name: str, config: BaseModel, input_data: BaseModel) -> BaseModel:
    """
    Runs a node with the given name, configuration, and input data.
    """
    # get the node class from the registry
    node_class = node_registry.get(node_name)
    if node_class is None:
        raise ValueError(f"Node {node_name} not found.")
    
    # create an instance of the node class
    node_instance = node_class(config)
    
    # run the node with the input data
    output_data = await node_instance(input_data)
    return output_data


