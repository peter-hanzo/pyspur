import json
import os
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Directory to store OpenAPI specs
OPENAPI_SPECS_DIR = "pyspur/openapi_specs"

# Ensure the directory exists
os.makedirs(OPENAPI_SPECS_DIR, exist_ok=True)

class OpenAPIEndpoint(BaseModel):
    path: str
    method: str
    summary: Optional[str] = None
    operationId: Optional[str] = None
    description: Optional[str] = None
    input_schema: Optional[Dict] = None
    output_schema: Optional[Dict] = None

class OpenAPISpec(BaseModel):
    id: str
    name: str
    description: str
    version: str
    endpoints: List[OpenAPIEndpoint]
    raw_spec: Dict

class CreateSpecRequest(BaseModel):
    spec: Dict

@router.post("/specs/", response_model=OpenAPISpec)
async def create_openapi_spec(request: CreateSpecRequest) -> OpenAPISpec:
    """Store an OpenAPI specification."""
    try:
        # Generate a unique ID for this spec
        spec_id = str(uuid4())
        
        # Extract basic info from the spec
        info = request.spec.get("info", {})
        
        # Parse all endpoints from the spec
        endpoints: List[OpenAPIEndpoint] = []
        for path, path_item in request.spec.get("paths", {}).items():
            for method, operation in path_item.items():
                # Extract input schema
                input_schema: Dict = {"properties": {}}
                
                # Path parameters
                if operation.get("parameters"):
                    path_params = [p for p in operation["parameters"] if p.get("in") == "path"]
                    if path_params:
                        input_schema["properties"]["pathParameters"] = {
                            "type": "object",
                            "properties": {p["name"]: p.get("schema", {}) for p in path_params}
                        }
                
                # Query parameters
                if operation.get("parameters"):
                    query_params = [p for p in operation["parameters"] if p.get("in") == "query"]
                    if query_params:
                        input_schema["properties"]["queryParameters"] = {
                            "type": "object",
                            "properties": {p["name"]: p.get("schema", {}) for p in query_params}
                        }
                
                # Header parameters
                if operation.get("parameters"):
                    header_params = [p for p in operation["parameters"] if p.get("in") == "header"]
                    if header_params:
                        input_schema["properties"]["headerParameters"] = {
                            "type": "object",
                            "properties": {p["name"]: p.get("schema", {}) for p in header_params}
                        }
                
                # Request body
                if operation.get("requestBody"):
                    content = operation["requestBody"].get("content", {})
                    if content:
                        media_type = next(iter(content))
                        input_schema["properties"]["requestBody"] = {
                            "mediaType": media_type,
                            "schema": content[media_type].get("schema", {})
                        }
                
                # Output schema
                output_schema: Dict = {"properties": {}}
                if operation.get("responses"):
                    for status_code, response in operation["responses"].items():
                        if response.get("content"):
                            media_type = next(iter(response["content"]))
                            output_schema["properties"][status_code] = {
                                "description": response.get("description", ""),
                                "mediaType": media_type,
                                "schema": response["content"][media_type].get("schema", {})
                            }
                        else:
                            output_schema["properties"][status_code] = {
                                "description": response.get("description", ""),
                                "mediaType": "application/json",
                                "schema": {}
                            }
                
                endpoints.append(OpenAPIEndpoint(
                    path=path,
                    method=method.upper(),
                    summary=operation.get("summary"),
                    operationId=operation.get("operationId"),
                    description=operation.get("description"),
                    input_schema=input_schema,
                    output_schema=output_schema
                ))
        
        spec_data = OpenAPISpec(
            id=spec_id,
            name=info.get("title", "Untitled API"),
            description=info.get("description", ""),
            version=info.get("version", "1.0.0"),
            endpoints=endpoints,
            raw_spec=request.spec
        )
        
        # Save the spec to a file
        spec_path = os.path.join(OPENAPI_SPECS_DIR, f"{spec_id}.json")
        with open(spec_path, "w") as f:
            json.dump(spec_data.dict(), f, indent=2)
            
        return spec_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/specs/", response_model=List[OpenAPISpec])
async def list_openapi_specs() -> List[OpenAPISpec]:
    """List all stored OpenAPI specifications."""
    try:
        specs = []
        for filename in os.listdir(OPENAPI_SPECS_DIR):
            if filename.endswith(".json"):
                with open(os.path.join(OPENAPI_SPECS_DIR, filename)) as f:
                    spec_data = json.load(f)
                    specs.append(OpenAPISpec(**spec_data))
        return specs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/specs/{spec_id}", response_model=OpenAPISpec)
async def get_openapi_spec(spec_id: str) -> OpenAPISpec:
    """Get a specific OpenAPI specification by ID."""
    try:
        spec_path = os.path.join(OPENAPI_SPECS_DIR, f"{spec_id}.json")
        if not os.path.exists(spec_path):
            raise HTTPException(status_code=404, detail="Specification not found")
            
        with open(spec_path) as f:
            spec_data = json.load(f)
            return OpenAPISpec(**spec_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/specs/{spec_id}")
async def delete_openapi_spec(spec_id: str) -> Dict[str, str]:
    """Delete a specific OpenAPI specification by ID."""
    try:
        spec_path = os.path.join(OPENAPI_SPECS_DIR, f"{spec_id}.json")
        if not os.path.exists(spec_path):
            raise HTTPException(status_code=404, detail="Specification not found")
            
        os.remove(spec_path)
        return {"message": "Specification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
