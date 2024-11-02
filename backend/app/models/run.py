from sqlalchemy import Computed, Integer, ForeignKey, Enum, JSON, DateTime, String
from sqlalchemy.orm import relationship, Mapped, mapped_column
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional, List, Any
from .base import BaseModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .workflow import WorkflowModel
    from .task import TaskModel


class RunStatus(PyEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RunModel(BaseModel):
    __tablename__ = "runs"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(
        String, Computed("'R' || _intid"), nullable=False, index=True
    )
    workflow_id: Mapped[str] = mapped_column(
        String, ForeignKey("workflows.id"), nullable=False, index=True
    )
    parent_run_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("runs.id"), nullable=True, index=True
    )
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus), default=RunStatus.PENDING, nullable=False
    )
    initial_inputs: Mapped[Any] = mapped_column(JSON)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    output_files: Mapped[Any] = mapped_column(JSON)

    workflow: Mapped["WorkflowModel"] = relationship("Workflow", back_populates="runs")
    tasks: Mapped[List["TaskModel"]] = relationship("Task", back_populates="run")
    parent_run: Mapped[Optional["RunModel"]] = relationship(
        "Run", remote_side=[id], backref="subruns"
    )
