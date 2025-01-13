from fastapi import (
    APIRouter,
    UploadFile,
    HTTPException,
    BackgroundTasks,
    File,
    Form,
    Depends,
)
from typing import List, Optional, Dict, TypedDict, Sequence
from pydantic import BaseModel
import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
import mimetypes

from ..models.knowledge_base_model import KnowledgeBaseModel
from ..database import get_db
from ..rag.datastore.factory import get_datastore, get_vector_stores, VectorStoreConfig
from ..rag.datastore.datastore import DataStore
from ..rag.models.document_schemas import Document, DocumentMetadata, Source, DocumentMetadataFilter
from ..rag.embedder import EmbeddingModels, EmbeddingModelConfig
from ..rag.pipeline import process_documents as process_documents_pipeline, ProcessingError
from .key_management import PROVIDER_CONFIGS


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
        source=Source.file,
        source_id=str(file_path.name),
        created_at=datetime.now(timezone.utc).isoformat(),
        url=None,
        author=None,
    )

    with open(file_path, "rb") as f:  # Changed to binary mode
        content = f.read()

        # For text-based files, decode the content
        if mimetype and mimetype.startswith("text/"):
            content = content.decode("utf-8")
        else:
            # For binary files, use base64 encoding
            import base64
            content = base64.b64encode(content).decode("utf-8")

        return Document(text=str(content), metadata=metadata)


# In-memory job storage (replace with database in production)
kb_creation_jobs: Dict[str, KnowledgeBaseCreationJob] = {}


class FileInfo(TypedDict):
    path: str
    mime_type: Optional[str]
    name: Optional[str]


async def update_kb_creation_job(
    job_id: str,
    status: Optional[str] = None,
    progress: Optional[float] = None,
    current_step: Optional[str] = None,
    processed_files: Optional[int] = None,
    total_chunks: Optional[int] = None,
    processed_chunks: Optional[int] = None,
    error_message: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """Update the status of a knowledge base creation job"""
    if job_id not in kb_creation_jobs:
        return

    job = kb_creation_jobs[job_id]
    if status:
        job.status = status
        # Update KB status in database
        if db is not None:
            # Extract the KB ID from the job ID (format: KB_ID_add_TIMESTAMP)
            kb_id = job_id.split("_add_")[0] if "_add_" in job_id else job_id
            kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
            if kb:
                # Update KB status based on job status
                if status == "completed":
                    kb.status = "ready"
                elif status == "failed":
                    kb.status = "failed"
                else:
                    kb.status = "processing"

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

    job.updated_at = datetime.now(timezone.utc).isoformat()


async def process_documents(
    kb_id: str,
    job_id: str,
    file_infos: Sequence[FileInfo],
    config: KnowledgeBaseCreate,
    db: Session
):
    """Background task to process uploaded documents"""
    try:
        # Prepare configuration
        processing_config = {
            "chunk_token_size": config.text_processing.chunk_token_size,
            "min_chunk_size_chars": config.text_processing.min_chunk_size_chars,
            "min_chunk_length_to_embed": config.text_processing.min_chunk_length_to_embed,
            "embeddings_batch_size": config.text_processing.embeddings_batch_size,
            "max_num_chunks": config.text_processing.max_num_chunks,
            "embedding_model": config.embedding.model,
            "vector_db": config.embedding.vector_db,
            "vision_config": (
                {
                    "enabled": config.text_processing.use_vision_model,
                    "model": config.text_processing.vision_model,
                    "provider": config.text_processing.vision_provider,
                }
                if config.text_processing.use_vision_model
                else None
            ),
        }

        # Convert FileInfo to Dict[str, Any] as required by process_documents_pipeline
        files_dict = [{"path": f["path"], "mime_type": f["mime_type"], "name": f["name"]} for f in file_infos]

        # Process documents using the pipeline
        async def progress_callback(progress: float, step: str, processed: int, total: int) -> None:
            await update_kb_creation_job(
                job_id,
                progress=progress,
                current_step=step,
                processed_files=processed if step == "parsing" else None,
                processed_chunks=processed if step == "embedding" else None,
                total_chunks=total if step == "embedding" else None,
                db=db
            )

        await process_documents_pipeline(
            kb_id=kb_id,
            files=files_dict,
            config=processing_config,
            on_progress=progress_callback,
        )

        # Update status to completed
        await update_kb_creation_job(
            job_id, status="completed", progress=1.0, current_step="completed", db=db
        )

    except ProcessingError as e:
        await update_kb_creation_job(job_id, status="failed", error_message=str(e), db=db)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        await update_kb_creation_job(job_id, status="failed", error_message=str(e), db=db)
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
            status="ready" if not files else "processing",  # Set status to ready if no files
            document_count=len(files) if files else 0,
            chunk_count=0,
            text_processing_config=kb_config.text_processing.model_dump(),
            embedding_config=kb_config.embedding.model_dump(),
        )
        db.add(kb)
        db.commit()
        db.refresh(kb)

        # Create initial job status only if files are present
        if files:
            now = datetime.now(timezone.utc).isoformat()
            kb_creation_jobs[kb.id] = KnowledgeBaseCreationJob(
                id=kb.id,
                created_at=now,
                updated_at=now,
                total_files=len(files),
            )

            # Read files and prepare file info before starting background task
            file_infos: List[FileInfo] = []
            kb_dir = Path(f"data/knowledge_bases/{kb.id}")
            kb_dir.mkdir(parents=True, exist_ok=True)

            for file in files:
                if file.filename:
                    file_path = kb_dir / file.filename
                    content = await file.read()
                    with open(file_path, "wb") as f:
                        f.write(content)
                    file_infos.append(FileInfo(
                        path=str(file_path),
                        mime_type=file.content_type,
                        name=file.filename
                    ))

            # Start background processing only if there are files
            if file_infos:
                background_tasks.add_task(process_documents, kb.id, kb.id, file_infos, kb_config, db)

        # Create initial response
        response = KnowledgeBaseResponse(
            id=kb.id,
            name=kb_config.name,
            description=kb_config.description,
            status="ready" if not files else "processing",
            created_at=kb.created_at.isoformat(),
            updated_at=kb.updated_at.isoformat(),
            document_count=len(files) if files else 0,
            chunk_count=0,
        )

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


@router.get("/{kb_id}/", response_model=KnowledgeBaseResponse, include_in_schema=True)
async def get_kb(kb_id: str, db: Session = Depends(get_db)):
    """Get knowledge base details"""
    try:
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        return KnowledgeBaseResponse(
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{kb_id}/", include_in_schema=True)
async def delete_kb(kb_id: str, db: Session = Depends(get_db)):
    """Delete a knowledge base"""
    try:
        # Get the knowledge base from the database
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        # Initialize vector database client
        vector_db = await get_datastore(kb.embedding_config["vector_db"], kb.embedding_config.get("model"))

        # Delete vectors from vector database
        await vector_db.delete(
            filter=DocumentMetadataFilter(
                document_id=kb_id,
            ),
            delete_all=False,
        )

        # Delete files from filesystem
        kb_dir = Path(f"data/knowledge_bases/{kb_id}")
        if kb_dir.exists():
            import shutil
            shutil.rmtree(kb_dir)

        # Remove from tracking database
        db.delete(kb)
        db.commit()

        # Clean up job status if exists
        if kb_id in kb_creation_jobs:
            del kb_creation_jobs[kb_id]

        return {"message": "Knowledge base deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{kb_id}/", response_model=KnowledgeBaseResponse)
async def update_kb(kb_id: str, update_data: KnowledgeBaseCreate):
    """Update knowledge base configuration"""
    try:
        # TODO: Implement update logic
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{kb_id}/sync/")
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
async def get_embedding_models() -> Dict[str, EmbeddingModelConfig]:
    """Get all available embedding models and their configurations."""
    try:
        models: Dict[str, EmbeddingModelConfig] = {}
        for model in EmbeddingModels:
            model_info = EmbeddingModels.get_model_info(model.value)
            if model_info:
                # Find the corresponding provider config
                provider_config = next(
                    (p for p in PROVIDER_CONFIGS if p.id == model_info.provider.value.lower()),
                    None
                )
                if provider_config:
                    # Add required environment variables from the provider config
                    model_info.required_env_vars = [p.name for p in provider_config.parameters if p.required]
                models[model.value] = model_info
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vector_stores/", response_model=Dict[str, VectorStoreConfig])
async def get_vector_stores_endpoint() -> Dict[str, VectorStoreConfig]:
    """Get all available vector stores and their configurations."""
    try:
        stores = get_vector_stores()
        # Add required environment variables from provider configs
        for store_id, store in stores.items():
            provider_config = next(
                (p for p in PROVIDER_CONFIGS if p.id == store_id),
                None
            )
            if provider_config:
                store.required_env_vars = [p.name for p in provider_config.parameters if p.required]
        return stores
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/job/", response_model=KnowledgeBaseCreationJob)
async def get_kb_creation_job_status(job_id: str):
    """Get the status of a knowledge base creation job"""
    # Try exact job ID first
    if job_id in kb_creation_jobs:
        return kb_creation_jobs[job_id]

    # If not found, try looking for any job that starts with the given ID
    matching_job_ids = [job_key for job_key in kb_creation_jobs.keys() if job_key.startswith(job_id)]
    if matching_job_ids:
        return kb_creation_jobs[matching_job_ids[-1]]  # Return the most recent job

    raise HTTPException(status_code=404, detail="Job not found")


@router.post("/{kb_id}/documents/", include_in_schema=True)
async def add_documents_to_kb(
    kb_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Add documents to an existing knowledge base"""
    try:
        # Get the knowledge base from the database
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        # Create job status with a unique ID
        job_id = f"{kb_id}_add_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        now = datetime.now(timezone.utc).isoformat()
        kb_creation_jobs[job_id] = KnowledgeBaseCreationJob(
            id=job_id,
            created_at=now,
            updated_at=now,
            total_files=len(files),
        )

        # Read files and prepare file info
        file_infos: List[FileInfo] = []
        kb_dir = Path(f"data/knowledge_bases/{kb_id}")
        kb_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            if file.filename:
                file_path = kb_dir / file.filename
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                file_infos.append(FileInfo(
                    path=str(file_path),
                    mime_type=file.content_type,
                    name=file.filename
                ))

        # Update knowledge base status
        kb.status = "processing"
        kb.document_count += len(files)
        db.commit()

        # Create config from stored settings
        kb_config = KnowledgeBaseCreate(
            name=kb.name,
            description=kb.description,
            text_processing=TextProcessingConfig(**kb.text_processing_config),
            embedding=EmbeddingConfig(**kb.embedding_config),
        )

        # Start background processing
        background_tasks.add_task(process_documents, kb_id, job_id, file_infos, kb_config, db)

        return {"id": job_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
