from regex import B
from node_types import node_type_registry
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from .models import Node, Link, Workflow

app = FastAPI()


@app.get("/node_types/", response_model=List[Dict[str, Any]])
async def get_node_types() -> List[Dict[str, Any]]:
    """
    Returns the schemas for all available node types.
    """
    # get the schemas for each node class
    node_schemas = []
    for node_class in node_type_registry.values():
        config_schema = node_class.config_schema()
        input_schema = node_class.input_schema()
        output_schema = node_class.output_schema()
        node_schemas.append(
            {
                "name": node_class.__name__,
                "config": config_schema.schema(),
                "input": input_schema.schema(),
                "output": output_schema.schema(),
            }
        )
    return node_schemas


@app.post("/run_node/", response_model=BaseModel)
async def run_node(node: Node, input_data: BaseModel) -> BaseModel:
    """
    Runs a node with the given name, configuration, and input data.
    """
    node_instance = node_type_registry[node.type](node.config)
    return await node_instance(input_data)


@app.post("/run_workflow/", response_model=BaseModel)
async def run_workflow(workflow: Workflow) -> Dict[str, BaseModel]:
    """
    Runs a workflow with the given nodes and edges.
    """
    results = await workflow.execute()
    return results
