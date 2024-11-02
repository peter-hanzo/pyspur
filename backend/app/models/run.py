from sqlalchemy import (
    Column,
    Computed,
    Integer,
    ForeignKey,
    Enum,
    JSON,
    DateTime,
    String,
)
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .base import BaseModel


class RunStatus(PyEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RunModel(BaseModel):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, autoincrement="auto")
    prefid = Column(String, Computed("'R' || id"), nullable=False, index=True)
    workflow_id = Column(
        Integer, ForeignKey("workflows.id"), nullable=False, index=True
    )
    parent_run_id = Column(Integer, ForeignKey("runs.id"), nullable=True, index=True)
    status = Column(Enum(RunStatus), default=RunStatus.PENDING, nullable=False)
    initial_inputs = Column(JSON)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    output_files = Column(JSON)

    workflow = relationship("Workflow", back_populates="runs")
    tasks = relationship("Task", back_populates="run")
    parent_run = relationship("Run", remote_side=[id], backref="subruns")
