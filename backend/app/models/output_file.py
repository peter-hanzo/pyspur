from sqlalchemy import Computed, Integer, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime, timezone
from .base import BaseModel


class OutputFileModel(BaseModel):
    __tablename__ = "output_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prefid: Mapped[str] = mapped_column(
        String, Computed("'OF' || id"), nullable=False, index=True
    )
    run_id: Mapped[int] = mapped_column(Integer, ForeignKey("runs.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )

    run = relationship("Run", back_populates="output_files")
