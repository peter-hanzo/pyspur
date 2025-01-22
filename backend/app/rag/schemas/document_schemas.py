from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class Source(str, Enum):
    file = "file"
    url = "url"
    text = "text"


class DocumentMetadata(BaseModel):
    """Metadata for a document."""
    source: Source = Source.text
    source_id: Optional[str] = None
    created_at: Optional[str] = None
    author: Optional[str] = None
    title: Optional[str] = None
    custom_metadata: Optional[Dict[str, str]] = None


class DocumentChunkMetadata(DocumentMetadata):
    """Metadata for a document chunk."""
    document_id: Optional[str] = None
    chunk_index: Optional[int] = None
    custom_metadata: Optional[Dict[str, str]] = Field(default_factory=dict)


class Document(BaseModel):
    """A document with its metadata."""
    id: Optional[str] = None
    text: str
    metadata: Optional[DocumentMetadata] = None


class DocumentChunk(BaseModel):
    """A chunk of a document with its metadata and embedding."""
    id: str
    text: str
    metadata: DocumentChunkMetadata
    embedding: Optional[List[float]] = None


class DocumentChunkWithScore(DocumentChunk):
    score: float


class DocumentWithChunks(Document):
    """A document with its chunks."""
    chunks: List[DocumentChunk] = Field(default_factory=list)


class DocumentMetadataFilter(BaseModel):
    document_id: Optional[str] = None
    source: Optional[Source] = None
    source_id: Optional[str] = None
    author: Optional[str] = None
    start_date: Optional[str] = None  # any date string format
    end_date: Optional[str] = None  # any date string format


class ChunkTemplate(BaseModel):
    """Configuration for chunk templates."""
    enabled: bool = False
    template: str = "{{ text }}"  # Default template just shows the text
    metadata_template: Optional[Dict[str, str]] = Field(
        default_factory=lambda: {"type": "text_chunk"}
    )


class ChunkingConfig(BaseModel):
    """Configuration for text chunking."""
    chunk_token_size: int = 200
    min_chunk_size_chars: int = 350
    min_chunk_length_to_embed: int = 5
    embeddings_batch_size: int = 128
    max_num_chunks: int = 10000
    template: ChunkTemplate = Field(default_factory=ChunkTemplate)


class Query(BaseModel):
    query: str
    filter: Optional[DocumentMetadataFilter] = None
    top_k: Optional[int] = 3


class QueryWithEmbedding(Query):
    embedding: List[float]


class QueryResult(BaseModel):
    query: str
    results: List[DocumentChunkWithScore]