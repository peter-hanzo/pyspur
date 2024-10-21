from pydantic import BaseModel


class NodeType(BaseModel):
    name: str
    module: str


class MinimumNodeConfig(BaseModel):
    node_type: NodeType
