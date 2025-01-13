from typing import List, Dict, Any, Optional, Callable, Coroutine

from loguru import logger

from .models.document_schemas import (
    DocumentWithChunks,
    DocumentChunk
)
from .document_store import DocumentStore


class ProcessingError(Exception):
    """Custom exception for processing errors"""
    pass


async def _call_progress(
    on_progress: Optional[Callable[[float, str, int, int], Coroutine[Any, Any, None]]],
    progress: float,
    stage: str,
    current: int,
    total: int
) -> None:
    """Helper function to safely call the progress callback"""
    if on_progress:
        await on_progress(progress, stage, current, total)


async def process_documents(
    collection_id: str,
    config: Dict[str, Any],
    on_progress: Optional[Callable[[float, str, int, int], Coroutine[Any, Any, None]]] = None,
) -> str:
    """
    Process documents and store them in the document store.

    Args:
        collection_id: Document collection ID
        config: Configuration for processing
        on_progress: Async callback for progress updates

    Returns:
        str: Document collection ID
    """
    logger.debug(f"Starting document processing for collection_id={collection_id}")

    try:
        # Initialize document store
        doc_store = DocumentStore(collection_id)

        # Get all documents
        doc_ids = doc_store.list_documents()
        if not doc_ids:
            logger.warning(f"No documents found for collection_id={collection_id}")
            return collection_id

        # Load all documents with chunks
        docs_with_chunks: List[DocumentWithChunks] = []
        for doc_id in doc_ids:
            doc = doc_store.get_document(doc_id)
            if doc:
                docs_with_chunks.append(doc)

        # Get all chunks
        all_chunks: List[DocumentChunk] = []
        for doc in docs_with_chunks:
            all_chunks.extend(doc.chunks)

        # Initialize progress
        await _call_progress(on_progress, 0.0, "processing", 0, len(all_chunks))

        # Process chunks (this is where you would add any additional processing steps)
        for i, _ in enumerate(all_chunks):
            # Add any chunk processing logic here
            await _call_progress(
                on_progress,
                (i + 1) / len(all_chunks),
                "processing",
                i + 1,
                len(all_chunks)
            )

        await _call_progress(on_progress, 1.0, "completed", len(all_chunks), len(all_chunks))

        return collection_id

    except Exception as e:
        logger.error(f"Error occurred during processing: {e}")
        raise ProcessingError(f"Error processing documents: {str(e)}")