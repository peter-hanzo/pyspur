from contextlib import asynccontextmanager
from dotenv import load_dotenv

from ..execution.workflow_executor_dask import WorkflowExecutorDask
from ..execution.node_executor import NodeExecutor
from ..nodes import node_registry
from fastapi import FastAPI
from typing import List, Dict, Any
from ..schemas.workflow import WorkflowNode, Workflow
from ..execution.dask_cluster_manager import DaskClusterManager

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    DaskClusterManager.get_client()
    yield
    DaskClusterManager.shutdown()


app = FastAPI(lifespan=lifespan)


@app.get("/node_types/", response_model=List[Dict[str, Any]])
async def get_node_types() -> List[Dict[str, Any]]:
    """
    Returns the schemas for all available node types.
    """
    # get the schemas for each node class
    node_schemas: List[Dict[str, Any]] = []
    for node_class in node_registry.values():
        config_schema = node_class.config_model
        input_schema = node_class.input_model
        output_schema = node_class.output_model
        node_schemas.append(
            {
                "name": node_class.__name__,
                "config": config_schema.model_json_schema(),
                "input": input_schema.model_json_schema(),
                "output": output_schema.model_json_schema(),
            }
        )
    return node_schemas


@app.post("/run_node/")
async def run_node(node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs a node with the given name, configuration, and input data.
    """
    executor = NodeExecutor(node)
    output_data = await executor(input_data)

    return output_data.model_dump()


@app.post("/run_workflow/")
async def run_workflow(
    workflow: Workflow, initial_inputs: Dict[str, Any] = {}
) -> Dict[str, Any]:
    """
    Runs a workflow with the given nodes and edges.
    """
    executor = WorkflowExecutorDask(workflow)
    return await executor(initial_inputs)
