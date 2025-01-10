from fastapi import (
    APIRouter,
    UploadFile,
    HTTPException,
    BackgroundTasks,
    File,
    Form,
    Depends,
)
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import json
import uuid
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from ..models.knowledge_base_model import KnowledgeBaseModel
from ..database import get_db
from ..rag.datastore.factory import get_datastore, get_vector_stores, VectorStoreConfig
from ..rag.datastore.datastore import DataStore
from ..rag.models.document_schemas import Document, DocumentMetadata
import mimetypes
from ..rag.embedder import (
    EmbeddingModels,
    EmbeddingModelConfig,
    EmbeddingProvider,
    CohereEncodingFormat,
)


# Models
class KnowledgeBaseCreationJob(BaseModel):
    """Status of a knowledge base creation job"""

    id: str
    status: str = "pending"  # pending, processing, completed, failed
    progress: float = 0.0  # 0 to 1
    current_step: str = "initializing"  # parsing, chunking, embedding, etc.
    total_files: int = 0
    processed_files: int = 0
    total_chunks: int = 0
    processed_chunks: int = 0
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class TextProcessingConfig(BaseModel):
    chunk_token_size: int = 200  # Default value from original chunker
    min_chunk_size_chars: int = 350  # Default value from original chunker
    min_chunk_length_to_embed: int = 5  # Default value from original chunker
    embeddings_batch_size: int = 128  # Default value from original chunker
    max_num_chunks: int = 10000  # Default value from original chunker
    use_vision_model: bool = False  # Whether to use vision model for PDF parsing
    vision_model: Optional[str] = None  # Model to use for vision-based parsing
    vision_provider: Optional[str] = (
        None  # Provider for vision model (openai, anthropic, gemini)
    )


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


router = APIRouter()


# Utility functions
async def initialize_datastore(vector_db: str) -> DataStore:
    """Initialize the vector database and return a DataStore instance"""
    return await get_datastore(vector_db)


async def process_document_file(
    file_path: Path, mimetype: Optional[str] = None
) -> Document:
    """Process a single document file and return a Document object"""
    # Get file type if not provided
    if mimetype is None:
        mimetype, _ = mimetypes.guess_type(str(file_path))

    if not mimetype:
        # Try to guess from extension
        ext = file_path.suffix.lower()
        if ext == ".md" or ext == ".mdx":
            mimetype = "text/markdown"
        elif ext == ".txt":
            mimetype = "text/plain"
        elif ext == ".html" or ext == ".htm":
            mimetype = "text/html"
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    metadata = DocumentMetadata(
        source=str(file_path.name),
        type=str(file_path.suffix[1:]),  # Remove the dot from extension
        created_at=datetime.utcnow().isoformat(),
        metadata={"mime_type": mimetype},
    )

    with open(file_path, "rb") as f:  # Changed to binary mode
        content = f.read()

        # For text-based files, decode the content
        if mimetype.startswith("text/"):
            content = content.decode("utf-8")
        elif isinstance(content, bytes):
            # For binary files, use base64 encoding
            import base64

            content = base64.b64encode(content).decode("utf-8")

        return Document(text=str(content), metadata=metadata)


# In-memory job storage (replace with database in production)
kb_creation_jobs: Dict[str, KnowledgeBaseCreationJob] = {}


async def update_kb_creation_job(
    job_id: str,
    status: Optional[str] = None,
    progress: Optional[float] = None,
    current_step: Optional[str] = None,
    processed_files: Optional[int] = None,
    total_chunks: Optional[int] = None,
    processed_chunks: Optional[int] = None,
    error_message: Optional[str] = None,
    db: Session = Depends(get_db),
) -> None:
    """Update the status of a knowledge base creation job"""
    if job_id not in kb_creation_jobs:
        return

    job = kb_creation_jobs[job_id]
    if status:
        job.status = status
        # Update KB status in database
        kb = (
            db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == job_id).first()
        )
        if kb:
            kb.status = status
            if error_message:
                kb.error_message = error_message
            if processed_chunks and total_chunks:
                kb.chunk_count = processed_chunks
            if processed_files:
                kb.document_count = processed_files
            db.commit()

    if progress is not None:
        job.progress = progress
    if current_step:
        job.current_step = current_step
    if processed_files is not None:
        job.processed_files = processed_files
    if total_chunks is not None:
        job.total_chunks = total_chunks
    if processed_chunks is not None:
        job.processed_chunks = processed_chunks
    if error_message:
        job.error_message = error_message

    job.updated_at = datetime.utcnow().isoformat()


async def process_documents(
    kb_id: str, files: List[UploadFile], config: KnowledgeBaseCreate
):
    """Background task to process uploaded documents"""
    try:
        # Create directory for knowledge base
        kb_dir = Path(f"data/knowledge_bases/{kb_id}")
        kb_dir.mkdir(parents=True, exist_ok=True)

        # Initialize job status
        await update_kb_creation_job(
            kb_id,
            status="processing",
            current_step="saving_files",
            total_files=len(files),
            processed_files=0,
        )

        # Initialize the vector database
        datastore = await initialize_datastore(config.embedding.vector_db)

        # Process each file
        documents: List[Document] = []
        for i, file in enumerate(files):
            if file.filename:  # Check if filename exists
                # Save file
                file_path = kb_dir / file.filename
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)

                # Update progress
                await update_kb_creation_job(
                    kb_id,
                    progress=(i + 1) / len(files) * 0.3,  # First 30% is file saving
                    processed_files=i + 1,
                    current_step="parsing_documents",
                )

                # Process the document
                document = await process_document_file(file_path, file.content_type)
                documents.append(document)

        # Get the API key for the selected vision provider
        vision_api_key = None
        if (
            config.text_processing.use_vision_model
            and config.text_processing.vision_provider
        ):
            provider_env_keys = {
                "openai": "OPENAI_API_KEY",
                "anthropic": "ANTHROPIC_API_KEY",
                "gemini": "GEMINI_API_KEY",
            }
            env_key = provider_env_keys.get(config.text_processing.vision_provider)
            if env_key:
                from backend.app.api.key_management import get_env_variable

                vision_api_key = get_env_variable(env_key)
                if not vision_api_key:
                    raise HTTPException(
                        status_code=400,
                        detail=f"API key not found for {config.text_processing.vision_provider}. Please set it in Settings > API Keys.",
                    )

        # Update status to embedding
        await update_kb_creation_job(
            kb_id,
            progress=0.4,  # 40% progress after parsing
            current_step="creating_embeddings",
        )

        # Store documents in vector database
        await datastore.upsert(
            documents=documents,
            chunk_token_size=config.text_processing.chunk_token_size,
            vision_config=(
                {
                    "enabled": config.text_processing.use_vision_model,
                    "model": config.text_processing.vision_model,
                    "api_key": vision_api_key,
                    "provider": config.text_processing.vision_provider,
                }
                if config.text_processing.use_vision_model
                else None
            ),
            on_chunk_embedded=lambda chunks_processed, total_chunks: update_kb_creation_job(
                kb_id,
                progress=0.4
                + (chunks_processed / total_chunks * 0.6),  # Last 60% is embedding
                processed_chunks=chunks_processed,
                total_chunks=total_chunks,
            ),
        )

        # Update status to completed
        await update_kb_creation_job(
            kb_id, status="completed", progress=1.0, current_step="completed"
        )

    except Exception as e:
        await update_kb_creation_job(kb_id, status="failed", error_message=str(e))
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
    db: Session = Depends(get_db),
):
    try:
        # Parse metadata
        metadata_dict = json.loads(metadata)
        kb_config = KnowledgeBaseCreate(**metadata_dict)

        # Validate vector_db is supported
        vector_stores = get_vector_stores()
        if kb_config.embedding.vector_db not in vector_stores:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported vector database: {kb_config.embedding.vector_db}. "
                f"Try one of the following: {', '.join(vector_stores.keys())}",
            )

        # Create knowledge base record
        kb = KnowledgeBaseModel(
            name=kb_config.name,
            description=kb_config.description,
            status="processing",
            document_count=len(files) if files else 0,
            chunk_count=0,
            text_processing_config=kb_config.text_processing.dict(),
            embedding_config=kb_config.embedding.dict(),
        )
        db.add(kb)
        db.commit()
        db.refresh(kb)

        # Create initial job status
        now = datetime.utcnow().isoformat()
        kb_creation_jobs[kb.id] = KnowledgeBaseCreationJob(
            id=kb.id,
            created_at=now,
            updated_at=now,
            total_files=len(files) if files else 0,
        )

        # Create initial response
        response = KnowledgeBaseResponse(
            id=kb.id,
            name=kb_config.name,
            description=kb_config.description,
            status="processing",
            created_at=kb.created_at.isoformat(),
            updated_at=kb.updated_at.isoformat(),
            document_count=len(files) if files else 0,
            chunk_count=0,
        )

        # Start background processing
        if files:
            background_tasks.add_task(process_documents, kb.id, files, kb_config)

        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[KnowledgeBaseResponse])
async def list_kbs(db: Session = Depends(get_db)):
    """List all knowledge bases"""
    try:
        kbs = db.query(KnowledgeBaseModel).all()
        return [
            KnowledgeBaseResponse(
                id=kb.id,
                name=kb.name,
                description=kb.description,
                status=kb.status,
                created_at=kb.created_at.isoformat(),
                updated_at=kb.updated_at.isoformat(),
                document_count=kb.document_count,
                chunk_count=kb.chunk_count,
                error_message=kb.error_message,
            )
            for kb in kbs
        ]
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


@router.get("/embedding_models/", response_model=Dict[str, EmbeddingModelConfig])
async def get_embedding_models():
    """Get all available embedding models and their configurations."""
    try:
        models = {}
        for model in EmbeddingModels:
            model_info = EmbeddingModels.get_model_info(model.value)
            if model_info:
                models[model.value] = model_info
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vector_stores/", response_model=Dict[str, VectorStoreConfig])
async def get_vector_stores_endpoint():
    """Get all available vector stores and their configurations."""
    try:
        return get_vector_stores()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{kb_id}/job", response_model=KnowledgeBaseCreationJob)
async def get_kb_creation_job_status(kb_id: str):
    """Get the status of a knowledge base creation job"""
    if kb_id not in kb_creation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return kb_creation_jobs[kb_id]
