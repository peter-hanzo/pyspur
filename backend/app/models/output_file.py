from sqlalchemy import Column, Computed, Integer, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .base import BaseModel


class OutputFileModel(BaseModel):
    __tablename__ = "output_files"

    id = Column(Integer, primary_key=True)
    prefid = Column(String, Computed("'OF' || id"), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    run = relationship("Run", back_populates="output_files")
