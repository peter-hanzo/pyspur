from typing import Optional, Dict, Any
from sqlalchemy import Computed, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from .base_model import BaseModel


class DocumentCollectionModel(BaseModel):
    """Model for document collections."""
    __tablename__ = "document_collections"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(
        String, Computed("'DC' || _intid"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    document_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(String)

    # Store configuration
    text_processing_config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Relationships
    vector_indices: Mapped[list["VectorIndexModel"]] = relationship(
        "VectorIndexModel",
        back_populates="document_collection",
        cascade="all, delete-orphan"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc)
    )


class VectorIndexModel(BaseModel):
    """Model for vector indices."""
    __tablename__ = "vector_indices"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(
        String, Computed("'VI' || _intid"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    document_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(String)

    # Store configuration
    embedding_config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Foreign key to document collection
    collection_id: Mapped[str] = mapped_column(
        String, ForeignKey("document_collections.id"), nullable=False
    )
    document_collection: Mapped[DocumentCollectionModel] = relationship(
        "DocumentCollectionModel",
        back_populates="vector_indices"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc)
    )
