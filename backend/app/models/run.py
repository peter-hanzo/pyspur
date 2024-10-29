from datetime import datetime
from enum import Enum as PyEnum
from logging import config
from tracemalloc import start

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from .task import TaskStatus

Base = declarative_base()


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    workflow = Column(JSON)  # Store the workflow as JSON data
    initial_inputs = Column(JSON, default={})  # Store initial inputs as JSON data
    start_time = Column(DateTime, default=datetime.now)
