from sqlalchemy import Column, Computed, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from .base import BaseModel


class WorkflowModel(BaseModel):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True)
    prefid = Column(String, Computed("'W' || id"), nullable=False, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    definition = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )
