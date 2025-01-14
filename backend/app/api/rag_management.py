from fastapi import (
    APIRouter,
    UploadFile,
    HTTPException,
    BackgroundTasks,
    File,
    Form,
    Depends,
)
from typing import List, Optional, Dict, TypedDict, Sequence, Union, Any
from pydantic import BaseModel
import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
import mimetypes

from ..models.knowledge_base_model import (
    DocumentCollectionModel,
    VectorIndexModel,
)
from ..database import get_db
from ..rag.datastore.factory import get_datastore, get_vector_stores
from ..rag.datastore.datastore import DataStore
from ..rag.models.document_schemas import Document, DocumentMetadata, Source, DocumentMetadataFilter
from ..rag.knowledge_base import KnowledgeBase
from ..rag.pipeline import ProcessingError



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


class DocumentCollectionCreate(BaseModel):
    """Request model for creating a document collection"""
    name: str
    description: Optional[str] = None
    text_processing: TextProcessingConfig


class VectorIndexCreate(BaseModel):
    """Request model for creating a vector index"""
    name: str
    description: Optional[str] = None
    collection_id: str
    embedding: EmbeddingConfig


class DocumentCollectionResponse(BaseModel):
    """Response model for document collection operations"""
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_at: str
    updated_at: str
    document_count: int
    chunk_count: int
    error_message: Optional[str] = None


class VectorIndexResponse(BaseModel):
    """Response model for vector index operations"""
    id: str
    name: str
    description: Optional[str] = None
    collection_id: str
    status: str
    created_at: str
    updated_at: str
    document_count: int
    chunk_count: int
    error_message: Optional[str] = None
    embedding_model: str
    vector_db: str


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
        # Update collection status in database
        if db is not None:
            # Extract the collection ID from the job ID (format: DC_ID_add_TIMESTAMP)
            collection_id = job_id.split("_add_")[0] if "_add_" in job_id else job_id
            collection = db.query(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id).first()
            if collection:
                # Update collection status based on job status
                if status == "completed":
                    collection.status = "ready"
                elif status == "failed":
                    collection.status = "failed"
                else:
                    collection.status = "processing"

                if error_message:
                    collection.error_message = error_message
                if processed_chunks and total_chunks:
                    collection.chunk_count = processed_chunks
                if processed_files:
                    collection.document_count = processed_files
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
    collection_id: str,
    job_id: str,
    file_infos: Sequence[FileInfo],
    config: Union[DocumentCollectionCreate, KnowledgeBaseCreate],
    db: Session
):
    """Background task to process uploaded documents"""
    try:
        # Create knowledge base manager
        kb = KnowledgeBase(collection_id)

        # Prepare configuration
        processing_config: Dict[str, Any] = {
            "chunk_token_size": config.text_processing.chunk_token_size,
            "min_chunk_size_chars": config.text_processing.min_chunk_size_chars,
            "min_chunk_length_to_embed": config.text_processing.min_chunk_length_to_embed,
            "embeddings_batch_size": config.text_processing.embeddings_batch_size,
            "max_num_chunks": config.text_processing.max_num_chunks,
        }

        # Add embedding config if it's a KnowledgeBaseCreate
        if isinstance(config, KnowledgeBaseCreate):
            processing_config["embedding_model"] = config.embedding.model
            processing_config["vector_db"] = config.embedding.vector_db
            if config.text_processing.use_vision_model:
                processing_config["vision_config"] = {
                    "enabled": config.text_processing.use_vision_model,
                    "model": config.text_processing.vision_model,
                    "provider": config.text_processing.vision_provider,
                }
            else:
                processing_config["vision_config"] = None

        # Convert FileInfo to Dict[str, Any]
        files_dict = [{"path": f["path"], "mime_type": f["mime_type"], "name": f["name"]} for f in file_infos]

        # Process documents and create chunks
        async def doc_progress_callback(progress: float, step: str, processed: int, total: int) -> None:
            await update_kb_creation_job(
                job_id,
                progress=progress,
                current_step=step,
                processed_files=processed if step == "parsing" else None,
                processed_chunks=processed if step == "chunking" else None,
                total_chunks=total if step == "chunking" else None,
                db=db
            )

        await kb.process_documents(
            files=files_dict,
            config=processing_config,
            on_progress=doc_progress_callback,
        )

        # Update status to completed
        await update_kb_creation_job(
            job_id,
            status="completed",
            progress=1.0,
            current_step="completed",
            db=db
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
        kb = DocumentCollectionModel(
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
        kbs = db.query(DocumentCollectionModel).all()
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
        kb = db.query(DocumentCollectionModel).filter(DocumentCollectionModel.id == kb_id).first()
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
        kb = db.query(DocumentCollectionModel).filter(DocumentCollectionModel.id == kb_id).first()
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
        kb = db.query(DocumentCollectionModel).filter(DocumentCollectionModel.id == kb_id).first()
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


@router.post("/collections/", response_model=DocumentCollectionResponse)
async def create_document_collection(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(None),
    metadata: str = Form(...),
    db: Session = Depends(get_db),
):
    """Create a new document collection"""
    try:
        # Parse metadata
        metadata_dict = json.loads(metadata)
        collection_config = DocumentCollectionCreate(**metadata_dict)

        # Create document collection record
        collection = DocumentCollectionModel(
            name=collection_config.name,
            description=collection_config.description,
            status="ready" if not files else "processing",
            document_count=len(files) if files else 0,
            chunk_count=0,
            text_processing_config=collection_config.text_processing.model_dump(),
        )
        db.add(collection)
        db.commit()
        db.refresh(collection)

        # Create initial job status only if files are present
        if files:
            now = datetime.now(timezone.utc).isoformat()
            kb_creation_jobs[collection.id] = KnowledgeBaseCreationJob(
                id=collection.id,
                created_at=now,
                updated_at=now,
                total_files=len(files),
            )

            # Read files and prepare file info
            file_infos: List[FileInfo] = []
            collection_dir = Path(f"data/knowledge_bases/{collection.id}")
            collection_dir.mkdir(parents=True, exist_ok=True)

            for file in files:
                if file.filename:
                    file_path = collection_dir / file.filename
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
                background_tasks.add_task(process_documents, collection.id, collection.id, file_infos, collection_config, db)

        # Create initial response
        response = DocumentCollectionResponse(
            id=collection.id,
            name=collection_config.name,
            description=collection_config.description,
            status="ready" if not files else "processing",
            created_at=collection.created_at.isoformat(),
            updated_at=collection.updated_at.isoformat(),
            document_count=len(files) if files else 0,
            chunk_count=0,
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/collections/", response_model=List[DocumentCollectionResponse])
async def list_document_collections(db: Session = Depends(get_db)):
    """List all document collections"""
    try:
        collections = db.query(DocumentCollectionModel).all()
        return [
            DocumentCollectionResponse(
                id=collection.id,
                name=collection.name,
                description=collection.description,
                status=collection.status,
                created_at=collection.created_at.isoformat(),
                updated_at=collection.updated_at.isoformat(),
                document_count=collection.document_count,
                chunk_count=collection.chunk_count,
                error_message=collection.error_message,
            )
            for collection in collections
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections/{collection_id}/", response_model=DocumentCollectionResponse)
async def get_document_collection(collection_id: str, db: Session = Depends(get_db)):
    """Get document collection details"""
    try:
        collection = db.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == collection_id
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Document collection not found")

        return DocumentCollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            status=collection.status,
            created_at=collection.created_at.isoformat(),
            updated_at=collection.updated_at.isoformat(),
            document_count=collection.document_count,
            chunk_count=collection.chunk_count,
            error_message=collection.error_message,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections/{collection_id}/")
async def delete_document_collection(collection_id: str, db: Session = Depends(get_db)):
    """Delete a document collection"""
    try:
        # Get the document collection from the database
        collection = db.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == collection_id
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Document collection not found")

        # Delete files from filesystem
        collection_dir = Path(f"data/knowledge_bases/{collection_id}")
        if collection_dir.exists():
            import shutil
            shutil.rmtree(collection_dir)

        # Remove from tracking database
        db.delete(collection)
        db.commit()

        # Clean up job status if exists
        if collection_id in kb_creation_jobs:
            del kb_creation_jobs[collection_id]

        return {"message": "Document collection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/indices/", response_model=VectorIndexResponse)
async def create_vector_index(
    background_tasks: BackgroundTasks,
    index_config: VectorIndexCreate,
    db: Session = Depends(get_db),
):
    """Create a new vector index from a document collection"""
    try:
        # Validate vector_db is supported
        vector_stores = get_vector_stores()
        if index_config.embedding.vector_db not in vector_stores:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported vector database: {index_config.embedding.vector_db}. "
                f"Try one of the following: {', '.join(vector_stores.keys())}",
            )

        # Check if collection exists
        collection = db.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == index_config.collection_id
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Document collection not found")

        # Create vector index record
        index = VectorIndexModel(
            name=index_config.name,
            description=index_config.description,
            status="processing",
            document_count=collection.document_count,
            chunk_count=collection.chunk_count,
            embedding_config=index_config.embedding.model_dump(),
            collection_id=collection.id,
        )
        db.add(index)
        db.commit()
        db.refresh(index)

        # Create job status
        now = datetime.now(timezone.utc).isoformat()
        kb_creation_jobs[index.id] = KnowledgeBaseCreationJob(
            id=index.id,
            created_at=now,
            updated_at=now,
            total_chunks=collection.chunk_count,
        )

        # Start background processing
        background_tasks.add_task(
            create_vector_index_from_collection,
            index.id,
            index_config.collection_id,
            index_config,
            db
        )

        # Create response
        response = VectorIndexResponse(
            id=index.id,
            name=index_config.name,
            description=index_config.description,
            collection_id=index_config.collection_id,
            status="processing",
            created_at=index.created_at.isoformat(),
            updated_at=index.updated_at.isoformat(),
            document_count=collection.document_count,
            chunk_count=collection.chunk_count,
            embedding_model=index_config.embedding.model,
            vector_db=index_config.embedding.vector_db,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indices/", response_model=List[VectorIndexResponse])
async def list_vector_indices(db: Session = Depends(get_db)):
    """List all vector indices"""
    try:
        indices = db.query(VectorIndexModel).all()
        return [
            VectorIndexResponse(
                id=index.id,
                name=index.name,
                description=index.description,
                collection_id=index.collection_id,
                status=index.status,
                created_at=index.created_at.isoformat(),
                updated_at=index.updated_at.isoformat(),
                document_count=index.document_count,
                chunk_count=index.chunk_count,
                error_message=index.error_message,
                embedding_model=index.embedding_config["model"],
                vector_db=index.embedding_config["vector_db"],
            )
            for index in indices
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indices/{index_id}/", response_model=VectorIndexResponse)
async def get_vector_index(index_id: str, db: Session = Depends(get_db)):
    """Get vector index details"""
    try:
        index = db.query(VectorIndexModel).filter(
            VectorIndexModel.id == index_id
        ).first()
        if not index:
            raise HTTPException(status_code=404, detail="Vector index not found")

        return VectorIndexResponse(
            id=index.id,
            name=index.name,
            description=index.description,
            collection_id=index.collection_id,
            status=index.status,
            created_at=index.created_at.isoformat(),
            updated_at=index.updated_at.isoformat(),
            document_count=index.document_count,
            chunk_count=index.chunk_count,
            error_message=index.error_message,
            embedding_model=index.embedding_config["model"],
            vector_db=index.embedding_config["vector_db"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/indices/{index_id}/")
async def delete_vector_index(index_id: str, db: Session = Depends(get_db)):
    """Delete a vector index"""
    try:
        # Get the vector index from the database
        index = db.query(VectorIndexModel).filter(
            VectorIndexModel.id == index_id
        ).first()
        if not index:
            raise HTTPException(status_code=404, detail="Vector index not found")

        # Initialize vector database client
        vector_db = await get_datastore(
            index.embedding_config["vector_db"],
            index.embedding_config.get("model")
        )

        # Delete vectors from vector database
        await vector_db.delete(
            filter=DocumentMetadataFilter(
                document_id=index_id,
            ),
            delete_all=False,
        )

        # Delete files from filesystem
        index_dir = Path(f"data/vector_indices/{index_id}")
        if index_dir.exists():
            import shutil
            shutil.rmtree(index_dir)

        # Remove from tracking database
        db.delete(index)
        db.commit()

        # Clean up job status if exists
        if index_id in kb_creation_jobs:
            del kb_creation_jobs[index_id]

        return {"message": "Vector index deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def create_vector_index_from_collection(
    index_id: str,
    collection_id: str,
    config: VectorIndexCreate,
    db: Session
):
    """Background task to create a vector index from a document collection"""
    try:
        # Create knowledge base manager
        kb = KnowledgeBase(collection_id)

        # Prepare configuration
        processing_config = {
            "embedding_model": config.embedding.model,
            "vector_db": config.embedding.vector_db,
            "embeddings_batch_size": 128,  # Default value
        }

        # Create vector index
        async def progress_callback(progress: float, step: str, processed: int, total: int) -> None:
            await update_kb_creation_job(
                index_id,
                progress=progress,
                current_step=step,
                processed_chunks=processed if step == "embedding" else None,
                total_chunks=total if step == "embedding" else None,
                db=db
            )

        await kb.create_vector_index(processing_config, progress_callback)

        # Update status to completed
        await update_kb_creation_job(
            index_id,
            status="completed",
            progress=1.0,
            current_step="completed",
            db=db
        )

    except ProcessingError as e:
        await update_kb_creation_job(index_id, status="failed", error_message=str(e), db=db)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        await update_kb_creation_job(index_id, status="failed", error_message=str(e), db=db)
        raise HTTPException(status_code=500, detail=str(e))
