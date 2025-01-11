from pathlib import Path
import json
import uuid
from typing import List, Dict, Any, Optional, Callable
import arrow
import numpy as np

from loguru import logger

from .parser import extract_text_from_file
from .chunker import ChunkingConfig, create_document_chunks
from .embedder import get_multiple_text_embeddings, EmbeddingModels
from .models.document_schemas import Document, DocumentMetadata, DocumentChunk
from .datastore.factory import get_datastore


class ProcessingError(Exception):
    """Custom exception for processing errors"""
    pass


async def process_documents(
    kb_id: str,
    files: List[Dict[str, Any]],
    config: Dict[str, Any],
    on_progress: Optional[Callable[[float, str, int, int], None]] = None,
) -> str:
    """
    Process documents through the RAG pipeline with intermediate storage.

    Args:
        kb_id: Knowledge base ID
        files: List of file information (path, type, etc.)
        config: Configuration for processing
        on_progress: Callback for progress updates

    Returns:
        str: Knowledge base ID
    """
    logger.debug(f"Starting document processing for kb_id={kb_id} with {len(files)} files.")

    try:
        # Create directory structure
        base_dir = Path(f"data/knowledge_bases/{kb_id}")
        logger.debug(f"Base directory set to: {base_dir}")
        base_dir.mkdir(parents=True, exist_ok=True)

        (base_dir / "raw").mkdir(exist_ok=True)
        (base_dir / "chunks").mkdir(exist_ok=True)
        (base_dir / "embeddings").mkdir(exist_ok=True)

        # Initialize progress
        if on_progress:
            on_progress(0.0, "parsing", 0, len(files))

        # 1. Parse documents
        documents: List[Document] = []
        for i, file_info in enumerate(files):
            logger.debug(f"Parsing file {i+1}/{len(files)}: {file_info.get('path')}")
            file_path = Path(file_info["path"])

            # Create document metadata
            metadata = DocumentMetadata(
                source=file_path.name,
                created_at=arrow.utcnow().isoformat(),
                author=file_info.get("author"),
                type=file_path.suffix[1:],  # Remove the dot
            )

            # Extract text
            with open(file_path, "rb") as f:
                text = extract_text_from_file(
                    f,
                    file_info["mime_type"],
                    config.get("vision_config")
                )

            # Save raw text
            doc_id = str(uuid.uuid4())
            raw_path = base_dir / "raw" / f"{doc_id}.txt"
            raw_path.write_text(text)

            # Create document
            doc = Document(id=doc_id, text=text, metadata=metadata)
            documents.append(doc)

            if on_progress:
                on_progress(
                    (i + 1) / len(files) * 0.3,  # First 30% for parsing
                    "parsing",
                    i + 1,
                    len(files)
                )

        # 2. Create chunks
        chunking_config = ChunkingConfig(
            chunk_token_size=config.get("chunk_token_size", 200),
            min_chunk_size_chars=config.get("min_chunk_size_chars", 350),
            min_chunk_length_to_embed=config.get("min_chunk_length_to_embed", 5),
            embeddings_batch_size=config.get("embeddings_batch_size", 128),
            max_num_chunks=config.get("max_num_chunks", 10000),
        )

        all_chunks: List[DocumentChunk] = []
        chunks_by_doc: Dict[str, List[DocumentChunk]] = {}

        logger.debug(f"Starting chunk creation for {len(documents)} documents.")

        for i, doc in enumerate(documents):
            # Create chunks
            doc_chunks, doc_id = create_document_chunks(doc, chunking_config)
            chunks_by_doc[doc_id] = doc_chunks
            all_chunks.extend(doc_chunks)

            # Save chunks
            chunks_path = base_dir / "chunks" / f"{doc_id}.json"
            with open(chunks_path, "w") as f:
                json.dump(
                    [chunk.model_dump() for chunk in doc_chunks],
                    f,
                    indent=2
                )

            if on_progress:
                on_progress(
                    0.3 + (i + 1) / len(documents) * 0.3,  # 30-60% for chunking
                    "chunking",
                    i + 1,
                    len(documents)
                )

            logger.debug(f"Created {len(doc_chunks)} chunks for doc_id={doc_id}")

        logger.debug("Chunk creation completed, moving on to embedding generation.")

        # 3. Create embeddings
        chunk_texts = [chunk.text for chunk in all_chunks]
        embeddings: np.ndarray = await get_multiple_text_embeddings(
            docs=chunk_texts,
            model=config.get("embedding_model", EmbeddingModels.TEXT_EMBEDDING_3_SMALL.value),
            batch_size=chunking_config.embeddings_batch_size
        )
        logger.debug(f"Embeddings generated for {len(all_chunks)} chunks.")

        # Update chunks with embeddings
        for i, chunk in enumerate(all_chunks):
            chunk.embedding = embeddings[i].tolist()

            # Save embeddings
            doc_id = chunk.metadata.document_id
            emb_path = base_dir / "embeddings" / f"{doc_id}_{i}.json"
            with open(emb_path, "w") as f:
                json.dump(
                    {"chunk_id": chunk.id, "embedding": chunk.embedding},
                    f
                )

            if on_progress:
                on_progress(
                    0.6 + (i + 1) / len(all_chunks) * 0.3,  # 60-90% for embeddings
                    "embedding",
                    i + 1,
                    len(all_chunks)
                )

            logger.debug(f"Saved embedding JSON file at index {i} for doc_id={doc_id}")

        # 4. Initialize datastore
        datastore = await get_datastore(config["vector_db"])
        logger.debug("Datastore initialized, starting to upsert chunks.")

        # 5. Insert chunks into datastore
        await datastore._upsert(chunks_by_doc)
        logger.debug("All chunks successfully upserted into datastore.")

        if on_progress:
            on_progress(1.0, "completed", len(files), len(files))

        logger.debug(f"Document processing completed for kb_id={kb_id}.")

        return kb_id

    except Exception as e:
        logger.error(f"Error occurred during processing: {e}")
        raise ProcessingError(f"Error processing documents: {str(e)}")