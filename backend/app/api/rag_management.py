from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
import json
import uuid
from datetime import datetime
import os
from pathlib import Path
from backend.app.rag.chunker import ChunkingConfig, get_document_chunks
from backend.app.rag.datastore.factory import get_datastore
from backend.app.rag.models.document_schemas import Document


# Models
class TextProcessingConfig(BaseModel):
    parsing_strategy: str
    chunk_token_size: int = 200  # Default value from original chunker
    min_chunk_size_chars: int = 350  # Default value from original chunker
    min_chunk_length_to_embed: int = 5  # Default value from original chunker
    embeddings_batch_size: int = 128  # Default value from original chunker
    max_num_chunks: int = 10000  # Default value from original chunker


class EmbeddingConfig(BaseModel):
    model: str
    vector_db: str
    search_strategy: str
    semantic_weight: Optional[float] = None
    keyword_weight: Optional[float] = None
    top_k: Optional[int] = None
    score_threshold: Optional[float] = None


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    text_processing: TextProcessingConfig
    embedding: EmbeddingConfig


class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_at: str
    updated_at: str
    document_count: int
    chunk_count: int
    error_message: Optional[str] = None


router = APIRouter(prefix="/rag", tags=["rag"])


# Utility functions
async def initialize_datastore(vector_db: str) -> None:
    """Initialize the vector database by setting environment variable and getting datastore instance"""
    os.environ["DATASTORE"] = vector_db
    datastore = await get_datastore()
    # You might want to add any initialization logic specific to the datastore here
    return datastore


async def process_document_file(file_path: Path) -> Document:
    """Process a single document file and return a Document object"""
    # TODO: Implement document parsing based on file type
    with open(file_path, "r") as f:
        content = f.read()

    return Document(
        text=content,
        metadata={
            "source": file_path.name,
            "file_type": file_path.suffix[1:],  # Remove the dot from extension
            "created_at": datetime.utcnow().isoformat(),
        },
    )


async def process_documents(
    kb_id: str, files: List[UploadFile], config: KnowledgeBaseCreate
):
    """Background task to process uploaded documents"""
    try:
        # Create directory for knowledge base
        kb_dir = Path(f"data/knowledge_bases/{kb_id}")
        kb_dir.mkdir(parents=True, exist_ok=True)

        # Initialize the vector database
        datastore = await initialize_datastore(config.embedding.vector_db)

        # Create chunking config from the text processing config
        chunking_config = ChunkingConfig(
            chunk_token_size=config.text_processing.chunk_token_size,
            min_chunk_size_chars=config.text_processing.min_chunk_size_chars,
            min_chunk_length_to_embed=config.text_processing.min_chunk_length_to_embed,
            embeddings_batch_size=config.text_processing.embeddings_batch_size,
            max_num_chunks=config.text_processing.max_num_chunks,
        )

        # Process each file
        for file in files:
            # Save file
            file_path = kb_dir / file.filename
            with open(file_path, "wb") as f:
                f.write(file.file.read())

            # Process the document
            document = await process_document_file(file_path)

            # Generate chunks with embeddings
            chunks_dict = await get_document_chunks(
                documents=[document],
                config=chunking_config,
                model=config.embedding.model,
            )

            # Store chunks in vector database
            for doc_id, chunks in chunks_dict.items():
                await datastore.upsert(
                    chunks,
                    {
                        "knowledge_base_id": kb_id,
                        "document_id": doc_id,
                        "embedding_model": config.embedding.model,
                        "vector_db": config.embedding.vector_db,
                    },
                )

        # Update status to ready
        await update_kb_status(kb_id, "ready")

    except Exception as e:
        await update_kb_status(kb_id, "failed", str(e))
        raise HTTPException(status_code=500, detail=str(e))


async def update_kb_status(
    kb_id: str, status: str, error_message: Optional[str] = None
):
    """Update knowledge base status"""
    # TODO: Implement status update in database
    # For now, just print the status
    print(f"Knowledge base {kb_id} status updated to {status}")
    if error_message:
        print(f"Error: {error_message}")


# Endpoints
@router.post("/", response_model=KnowledgeBaseResponse)
async def create_kb(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(None),
    metadata: str = Form(...),
):
    try:
        # Parse metadata
        metadata_dict = json.loads(metadata)
        kb_config = KnowledgeBaseCreate(**metadata_dict)

        # Validate vector_db is supported
        if kb_config.embedding.vector_db not in [
            "chroma",
            "llama",
            "pinecone",
            "weaviate",
            "milvus",
            "zilliz",
            "redis",
            "azurecosmosdb",
            "qdrant",
            "azuresearch",
            "supabase",
            "postgres",
            "analyticdb",
            "elasticsearch",
            "mongodb",
        ]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported vector database: {kb_config.embedding.vector_db}",
            )

        # Generate unique ID
        kb_id = str(uuid.uuid4())

        # Create initial response
        response = KnowledgeBaseResponse(
            id=kb_id,
            name=kb_config.name,
            description=kb_config.description,
            status="processing",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            document_count=len(files) if files else 0,
            chunk_count=0,  # This will be updated during processing
        )

        # Start background processing
        if files:
            background_tasks.add_task(process_documents, kb_id, files, kb_config)

        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[KnowledgeBaseResponse])
async def list_kbs():
    """List all knowledge bases"""
    try:
        # TODO: Implement listing from database
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_kb(kb_id: str):
    """Get knowledge base details"""
    try:
        # TODO: Implement retrieval from database
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{kb_id}")
async def delete_kb(kb_id: str):
    """Delete a knowledge base"""
    try:
        # TODO: Implement deletion logic
        # 1. Remove from vector database
        # 2. Delete files
        # 3. Remove from tracking database
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_kb(kb_id: str, update_data: KnowledgeBaseCreate):
    """Update knowledge base configuration"""
    try:
        # TODO: Implement update logic
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{kb_id}/sync")
async def sync_kb(kb_id: str, background_tasks: BackgroundTasks):
    """Sync knowledge base with external tool"""
    try:
        # TODO: Implement sync logic
        # 1. Get sync configuration
        # 2. Fetch new/updated content
        # 3. Process and update vector database
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
