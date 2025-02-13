from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FileResponseSchema(BaseModel):
    name: str
    path: str
    size: int
    created: datetime
    workflow_id: Optional[str] = None
