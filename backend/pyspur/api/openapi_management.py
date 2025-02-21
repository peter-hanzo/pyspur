from typing import Any, Dict, List, TypedDict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..nodes.openapi.openapi_gen import NodeInfo, generate_node_from_openapi

router = APIRouter()

class OpenAPIEndpoint(BaseModel):
    path: str
    method: str
    summary: str | None = None
    operation_id: str | None = None


class CreateNodesFromOpenAPIRequest(BaseModel):
    endpoints: List[OpenAPIEndpoint]
    spec: Dict[str, Any]


class CreateNodesResponse(TypedDict):
    message: str
    created_nodes: List[NodeInfo]


@router.post("/create_from_openapi/")
async def create_nodes_from_openapi(request: CreateNodesFromOpenAPIRequest) -> CreateNodesResponse:
    """Create nodes from selected OpenAPI endpoints."""
    try:
        created_nodes: List[NodeInfo] = []
        for endpoint in request.endpoints:
            # Generate a node for each selected endpoint
            node_info = generate_node_from_openapi(
                path=endpoint.path,
                method=endpoint.method.lower(),
                operation_id=endpoint.operation_id,
                summary=endpoint.summary,
                spec=request.spec,
            )
            created_nodes.append(node_info)

        return {
            "message": f"Successfully created {len(created_nodes)} nodes",
            "created_nodes": created_nodes,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
