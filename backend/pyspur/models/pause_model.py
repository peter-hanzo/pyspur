from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Computed, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import BaseModel


class PauseAction(PyEnum):
    """Actions that can be taken on a paused workflow."""
    APPROVE = "APPROVE"
    DECLINE = "DECLINE"
    OVERRIDE = "OVERRIDE"


class PauseHistoryModel(BaseModel):
    """Model to track pause history for workflow runs."""
    __tablename__ = "pause_history"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(String, Computed("'PH' || _intid"), nullable=False, unique=True)
    run_id: Mapped[str] = mapped_column(String, ForeignKey("runs.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String, nullable=False)
    pause_message: Mapped[str] = mapped_column(String, nullable=True)
    pause_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))
    resume_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resume_user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resume_action: Mapped[Optional[PauseAction]] = mapped_column(Enum(PauseAction), nullable=True)
    input_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(String, nullable=True)