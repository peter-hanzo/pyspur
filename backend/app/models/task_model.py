from sqlalchemy import (
    Computed,
    Integer,
    ForeignKey,
    Enum,
    String,
    JSON,
    DateTime,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional, Any
from .base_model import BaseModel


class TaskStatus(PyEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskModel(BaseModel):
    __tablename__ = "tasks"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True)
    id: Mapped[str] = mapped_column(
        String, Computed("'T' || _intid"), nullable=False, index=True
    )
    run_id: Mapped[str] = mapped_column(String, ForeignKey("runs.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String, nullable=False)
    parent_task_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("tasks.id")
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False
    )
    inputs: Mapped[Any] = mapped_column(JSON)
    outputs: Mapped[Any] = mapped_column(JSON)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime)

    parent_task: Mapped[Optional["TaskModel"]] = relationship(
        "TaskModel", remote_side=[id], backref="subtasks"
    )
