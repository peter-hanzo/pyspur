from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MessageBase(BaseModel):
    content: Dict[str, Any]


class MessageResponse(MessageBase):
    id: str
    session_id: str
    run_id: Optional[str]
    created_at: datetime
    updated_at: datetime


class SessionBase(BaseModel):
    pass


class SessionCreate(SessionBase):
    user_id: str


class SessionUpdate(SessionBase):
    pass


class SessionResponse(SessionBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse]


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int
