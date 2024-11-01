from sqlalchemy import (
    Column,
    Computed,
    Integer,
    ForeignKey,
    Enum,
    String,
    JSON,
    DateTime,
)
from sqlalchemy.orm import relationship, declarative_base
from enum import Enum as PyEnum

Base = declarative_base()


class TaskStatus(PyEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    prefid = Column(String, Computed("T || id"), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    node_id = Column(String, nullable=False)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"))
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    inputs = Column(JSON)
    outputs = Column(JSON)
    start_time = Column(DateTime)
    end_time = Column(DateTime)

    run = relationship("Run", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")
