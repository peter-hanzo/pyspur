from typing import Optional, Dict, Any
from sqlalchemy import Computed, Integer, String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from .base_model import BaseModel


class KnowledgeBaseModel(BaseModel):
    __tablename__ = "knowledge_bases"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(
        String, Computed("'KB' || _intid"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    document_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(String)

    # Store configuration
    text_processing_config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    embedding_config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc)
    )
