from contextlib import asynccontextmanager
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..execution.dask_cluster_manager import DaskClusterManager
from ..execution.node_executor import NodeExecutor
from ..execution.workflow_executor_dask import WorkflowExecutorDask
from ..nodes.factory import NodeFactory
from ..schemas.workflow import Workflow, WorkflowNode

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    DaskClusterManager.get_client()
    yield
    DaskClusterManager.shutdown()


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/node_types/")
async def get_node_types() -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns the schemas for all available node types.
    """
    # get the schemas for each node class
    node_groups = NodeFactory.get_all_node_types()

    response: Dict[str, List[Dict[str, Any]]] = {}
    for group_name, node_types in node_groups.items():
        node_schemas: List[Dict[str, Any]] = []
        for node_type in node_types:
            node_class = node_type.node_class
            try:
                input_schema = node_class.input_model.model_json_schema()
            except AttributeError:
                input_schema = {}
            try:
                output_schema = node_class.output_model.model_json_schema()
            except AttributeError:
                output_schema = {}
            node_schema: Dict[str, Any] = {
                "name": node_type.node_type_name,
                "input": input_schema,
                "output": output_schema,
                "config": node_class.config_model.model_json_schema(),
            }
            node_schemas.append(node_schema)
        response[group_name] = node_schemas

    return response


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
