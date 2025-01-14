from fastapi import (
    APIRouter,
    UploadFile,
    HTTPException,
    BackgroundTasks,
    File,
    Form,
    Depends,
)
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
import os

from ..models.dc_and_vi_model import (
    DocumentCollectionModel,
    VectorIndexModel,
)
from ..database import get_db
from ..rag.document_collection import DocumentStore
from ..rag.vector_index import VectorIndex


# Models
class TextProcessingConfig(BaseModel):
    chunk_token_size: int = 200  # Default value from original chunker
    min_chunk_size_chars: int = 350  # Default value from original chunker
    min_chunk_length_to_embed: int = 5  # Default value from original chunker
    embeddings_batch_size: int = 128  # Default value from original chunker
    max_num_chunks: int = 10000  # Default value from original chunker
    use_vision_model: bool = False  # Whether to use vision model for PDF parsing
    vision_model: Optional[str] = None  # Model to use for vision-based parsing
    vision_provider: Optional[str] = None  # Provider for vision model

    def get_vision_config(self) -> Optional[Dict[str, Any]]:
        """Get vision configuration with API key if vision model is enabled."""
        if not self.use_vision_model or not self.vision_model or not self.vision_provider:
            return None

        # Get API key based on provider
        api_key = None
        if self.vision_provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
        elif self.vision_provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")

        if not api_key:
            raise HTTPException(
                status_code=400,
                detail=f"Missing API key for vision provider {self.vision_provider}"
            )

        return {
            "model": self.vision_model,
            "provider": self.vision_provider,
            "api_key": api_key,
        }


class EmbeddingConfig(BaseModel):
    model: str
    vector_db: str
    search_strategy: str
    semantic_weight: Optional[float] = None
    keyword_weight: Optional[float] = None
    top_k: Optional[int] = None
    score_threshold: Optional[float] = None


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


# Progress tracking models
class ProcessingProgress(BaseModel):
    """Base model for tracking processing progress"""
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

# In-memory progress tracking (replace with database in production)
collection_progress: Dict[str, ProcessingProgress] = {}
index_progress: Dict[str, ProcessingProgress] = {}

async def update_collection_progress(
    collection_id: str,
    status: Optional[str] = None,
    progress: Optional[float] = None,
    current_step: Optional[str] = None,
    processed_files: Optional[int] = None,
    total_chunks: Optional[int] = None,
    processed_chunks: Optional[int] = None,
    error_message: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """Update document collection processing progress"""
    if collection_id not in collection_progress:
        now = datetime.now(timezone.utc).isoformat()
        collection_progress[collection_id] = ProcessingProgress(
            id=collection_id,
            created_at=now,
            updated_at=now,
        )

    progress_obj = collection_progress[collection_id]
    if status:
        progress_obj.status = status
        # Update collection status in database
        if db is not None:
            collection = db.query(DocumentCollectionModel).filter(
                DocumentCollectionModel.id == collection_id
            ).first()
            if collection:
                collection.status = "ready" if status == "completed" else status
                if error_message:
                    collection.error_message = error_message
                if processed_chunks and total_chunks:
                    collection.chunk_count = processed_chunks
                if processed_files:
                    collection.document_count = processed_files
                db.commit()

    if progress is not None:
        progress_obj.progress = progress
    if current_step:
        progress_obj.current_step = current_step
    if processed_files is not None:
        progress_obj.processed_files = processed_files
    if total_chunks is not None:
        progress_obj.total_chunks = total_chunks
    if processed_chunks is not None:
        progress_obj.processed_chunks = processed_chunks
    if error_message:
        progress_obj.error_message = error_message

    progress_obj.updated_at = datetime.now(timezone.utc).isoformat()

async def update_index_progress(
    index_id: str,
    status: Optional[str] = None,
    progress: Optional[float] = None,
    current_step: Optional[str] = None,
    total_chunks: Optional[int] = None,
    processed_chunks: Optional[int] = None,
    error_message: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """Update vector index processing progress"""
    if index_id not in index_progress:
        now = datetime.now(timezone.utc).isoformat()
        index_progress[index_id] = ProcessingProgress(
            id=index_id,
            created_at=now,
            updated_at=now,
        )

    progress_obj = index_progress[index_id]
    if status:
        progress_obj.status = status
        # Update index status in database
        if db is not None:
            index = db.query(VectorIndexModel).filter(
                VectorIndexModel.id == index_id
            ).first()
            if index:
                index.status = "ready" if status == "completed" else status
                if error_message:
                    index.error_message = error_message
                if processed_chunks:
                    index.chunk_count = processed_chunks
                db.commit()

    if progress is not None:
        progress_obj.progress = progress
    if current_step:
        progress_obj.current_step = current_step
    if total_chunks is not None:
        progress_obj.total_chunks = total_chunks
    if processed_chunks is not None:
        progress_obj.processed_chunks = processed_chunks
    if error_message:
        progress_obj.error_message = error_message

    progress_obj.updated_at = datetime.now(timezone.utc).isoformat()

router = APIRouter()


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

        # Validate vision model configuration if enabled
        if collection_config.text_processing.use_vision_model:
            vision_config = collection_config.text_processing.get_vision_config()
            if not vision_config:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid vision model configuration"
                )

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

        # Process files if present
        if files:
            # Read files and prepare file info
            file_infos: List[Dict[str, Any]] = []
            collection_dir = Path(f"data/knowledge_bases/{collection.id}")
            collection_dir.mkdir(parents=True, exist_ok=True)

            for file in files:
                if file.filename:
                    file_path = collection_dir / file.filename
                    content = await file.read()
                    with open(file_path, "wb") as f:
                        f.write(content)
                    file_infos.append({
                        "path": str(file_path),
                        "mime_type": file.content_type,
                        "name": file.filename
                    })

            # Start background processing
            if file_infos:
                doc_store = DocumentStore(collection.id)

                # Create progress callback
                async def progress_callback(progress: float, step: str, processed: int, total: int) -> None:
                    await update_collection_progress(
                        collection.id,
                        progress=progress,
                        current_step=step,
                        processed_files=processed if step == "parsing" else None,
                        processed_chunks=processed if step == "chunking" else None,
                        total_chunks=total if step == "chunking" else None,
                        db=db
                    )

                background_tasks.add_task(
                    doc_store.process_documents,
                    file_infos,
                    collection_config.text_processing.model_dump(),
                    progress_callback
                )

        # Create response
        return DocumentCollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            status=collection.status,
            created_at=collection.created_at.isoformat(),
            updated_at=collection.updated_at.isoformat(),
            document_count=collection.document_count,
            chunk_count=collection.chunk_count,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/indices/", response_model=VectorIndexResponse)
async def create_vector_index(
    background_tasks: BackgroundTasks,
    index_config: VectorIndexCreate,
    db: Session = Depends(get_db),
):
    """Create a new vector index from a document collection"""
    try:
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

        # Start background processing
        doc_store = DocumentStore(collection.id)
        vector_index = VectorIndex(index.id)

        # Get documents with chunks
        docs_with_chunks = []
        for doc_id in doc_store.list_documents():
            doc = doc_store.get_document(doc_id)
            if doc:
                docs_with_chunks.append(doc)

        # Create progress callback
        async def progress_callback(progress: float, step: str, processed: int, total: int) -> None:
            await update_index_progress(
                index.id,
                progress=progress,
                current_step=step,
                processed_chunks=processed if step == "embedding" else None,
                total_chunks=total if step == "embedding" else None,
                db=db
            )

        # Start vector index creation
        background_tasks.add_task(
            vector_index.create_from_document_collection,
            docs_with_chunks,
            index_config.embedding.model_dump(),
            progress_callback
        )

        # Create response
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

        # Delete from vector store and filesystem
        vector_index = VectorIndex(index.id)
        success = await vector_index.delete()
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete vector index data")

        # Remove from tracking database
        db.delete(index)
        db.commit()

        return {"message": "Vector index deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

        return {"message": "Document collection deleted successfully"}
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


# Add progress tracking endpoints
@router.get("/collections/{collection_id}/progress", response_model=ProcessingProgress)
async def get_collection_progress(collection_id: str):
    """Get document collection processing progress"""
    if collection_id not in collection_progress:
        raise HTTPException(status_code=404, detail="No progress information found")
    return collection_progress[collection_id]

@router.get("/indices/{index_id}/progress", response_model=ProcessingProgress)
async def get_index_progress(index_id: str):
    """Get vector index processing progress"""
    if index_id not in index_progress:
        raise HTTPException(status_code=404, detail="No progress information found")
    return index_progress[index_id]


@router.post("/collections/{collection_id}/documents", response_model=DocumentCollectionResponse)
async def add_documents_to_collection(
    collection_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Add documents to an existing collection"""
    try:
        # Get the document collection
        collection = db.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == collection_id
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Document collection not found")

        # Read files and prepare file info
        file_infos: List[Dict[str, Any]] = []
        collection_dir = Path(f"data/knowledge_bases/{collection.id}")
        collection_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            if file.filename:
                file_path = collection_dir / file.filename
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                file_infos.append({
                    "path": str(file_path),
                    "mime_type": file.content_type,
                    "name": file.filename
                })

        # Update collection status
        collection.status = "processing"
        collection.document_count += len(files)
        db.commit()
        db.refresh(collection)

        # Start background processing
        if file_infos:
            doc_store = DocumentStore(collection.id)

            # Create progress callback
            async def progress_callback(progress: float, step: str, processed: int, total: int) -> None:
                await update_collection_progress(
                    collection.id,
                    progress=progress,
                    current_step=step,
                    processed_files=processed if step == "parsing" else None,
                    processed_chunks=processed if step == "chunking" else None,
                    total_chunks=total if step == "chunking" else None,
                    db=db
                )

            background_tasks.add_task(
                doc_store.process_documents,
                file_infos,
                collection.text_processing_config,
                progress_callback
            )

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

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/collections/{collection_id}/documents/{document_id}")
async def delete_document_from_collection(
    collection_id: str,
    document_id: str,
    db: Session = Depends(get_db),
):
    """Delete a document from a collection"""
    try:
        # Get the document collection
        collection = db.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == collection_id
        ).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Document collection not found")

        # Initialize document store
        doc_store = DocumentStore(collection.id)

        # Check if document exists
        doc = doc_store.get_document(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in collection")

        # Delete document
        success = doc_store.delete_document(document_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete document")

        # Update collection stats
        collection.document_count -= 1
        if doc.chunks:
            collection.chunk_count -= len(doc.chunks)
        db.commit()

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
