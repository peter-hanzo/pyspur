from datetime import datetime
from logging import config
from tracemalloc import start
from sqlalchemy import Column, String, Integer, JSON, DateTime
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from enum import Enum as PyEnum
from .task import TaskStatus

Base = declarative_base()


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    workflow = Column(JSON)  # Store the workflow as JSON data
    initial_inputs = Column(JSON, default={})  # Store initial inputs as JSON data
    start_time = Column(DateTime, default=datetime.now)
