from sqlalchemy import Column, String, Integer, ForeignKey, Enum, JSON, DateTime
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
    run_id = Column(Integer, ForeignKey("runs.id"))
    node_id = Column(String)  # id of the node in the workflow
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    config = Column(JSON)  # Store task configuration as JSON data
    inputs = Column(JSON)  # Store inputs as JSON data
    outputs = Column(JSON)  # Store outputs as JSON data
    start_time = Column(DateTime)
    end_time = Column(DateTime)
