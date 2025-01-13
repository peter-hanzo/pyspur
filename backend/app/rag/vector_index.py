from pathlib import Path
import json
from typing import List, Dict, Any, Optional, Callable, Coroutine, cast
from loguru import logger

from .embedder import get_multiple_text_embeddings, EmbeddingModels
from .models.document_schemas import (
    Document,
    DocumentWithChunks,
    DocumentChunk
)
from .datastore.factory import get_datastore
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


class VectorIndex:
    """Manages vector index operations."""

    def __init__(self, index_id: str):
        """Initialize vector index manager."""
        self.index_id = index_id
        self.base_dir = Path(f"data/vector_indices/{index_id}")
        self.embeddings_dir = self.base_dir / "embeddings"
        self.config_path = self.base_dir / "config.json"

        # Create base directory
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.embeddings_dir.mkdir(exist_ok=True)

        # Load or create config
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load vector index configuration."""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        return {}

    def _save_config(self) -> None:
        """Save vector index configuration."""
        with open(self.config_path, "w") as f:
            json.dump(self.config, f, indent=2)

    def update_config(self, config: Dict[str, Any]) -> None:
        """Update vector index configuration."""
        self.config.update(config)
        self._save_config()

    async def create_from_document_collection(
        self,
        collection_id: str,
        config: Dict[str, Any],
        on_progress: Optional[Callable[[float, str, int, int], Coroutine[Any, Any, None]]] = None,
    ) -> str:
        """
        Create a vector index from a document collection.

        Args:
            collection_id: Document collection ID
            config: Configuration for processing
            on_progress: Async callback for progress updates

        Returns:
            str: Vector index ID
        """
        logger.debug(f"Creating vector index from collection_id={collection_id}")

        try:
            # Update config
            self.update_config(config)

            # Initialize document store
            doc_store = DocumentStore(collection_id)

            # Get all documents
            doc_ids = doc_store.list_documents()
            if not doc_ids:
                logger.warning(f"No documents found for collection_id={collection_id}")
                return self.index_id

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
            await _call_progress(on_progress, 0.0, "embedding", 0, len(all_chunks))

            # Get chunk texts
            chunk_texts = [chunk.text for chunk in all_chunks]

            try:
                logger.debug(f"Requesting embeddings for {len(chunk_texts)} chunks")

                # Use OpenAI's text-embedding-3-small by default
                embedding_model = config.get("embedding_model", EmbeddingModels.TEXT_EMBEDDING_3_SMALL.value)
                model_info = EmbeddingModels.get_model_info(embedding_model)
                if not model_info:
                    raise ValueError(f"Unknown embedding model: {embedding_model}")

                logger.debug(f"Using embedding model: {embedding_model} with {model_info.dimensions} dimensions")

                embeddings: Any = await get_multiple_text_embeddings(
                    docs=chunk_texts,
                    model=embedding_model,
                    dimensions=model_info.dimensions,
                    batch_size=config.get("embeddings_batch_size", 128),
                    api_key=config.get("openai_api_key")
                )

                # Log embedding details
                logger.debug(f"Embeddings generated for {len(all_chunks)} chunks.")
            except Exception as e:
                logger.error(f"Error generating embeddings: {str(e)}")
                raise ProcessingError(f"Failed to generate embeddings: {str(e)}")

            # Update chunks with embeddings
            for i, chunk in enumerate(all_chunks):
                # Ensure we have a valid embedding array
                if embeddings[i] is None:
                    logger.error(f"No embedding generated for chunk {i}")
                    continue

                # Convert embedding to list of floats
                try:
                    embedding_list = embeddings[i].tolist() if hasattr(embeddings[i], 'tolist') else embeddings[i]
                    if not isinstance(embedding_list, list):
                        embedding_list = [float(x) for x in embedding_list]
                    else:
                        embedding_list = [float(x) for x in embedding_list]
                    chunk.embedding = embedding_list
                except Exception as e:
                    logger.error(f"Error converting embedding: {str(e)}")
                    continue

                # Save embeddings
                doc_id = chunk.metadata.document_id
                if doc_id is not None:  # Add null check
                    emb_path = self.embeddings_dir / f"{doc_id}_{i}.json"
                    with open(emb_path, "w") as f:
                        json.dump(
                            {"chunk_id": chunk.id, "embedding": embedding_list},
                            f
                        )

                await _call_progress(
                    on_progress,
                    (i + 1) / len(all_chunks) * 0.8,  # First 80% for embeddings
                    "embedding",
                    i + 1,
                    len(all_chunks)
                )

            # Initialize datastore
            datastore = await get_datastore(
                config["vector_db"],
                embedding_model=embedding_model
            )
            logger.debug("Datastore initialized, starting to upsert chunks.")

            # Insert chunks into datastore
            await datastore.upsert(
                cast(List[Document], docs_with_chunks),
                chunk_token_size=config.get("chunk_token_size", 200)
            )
            logger.debug("All chunks successfully upserted into datastore.")

            await _call_progress(on_progress, 1.0, "completed", len(all_chunks), len(all_chunks))

            return self.index_id

        except Exception as e:
            logger.error(f"Error occurred during processing: {e}")
            raise ProcessingError(f"Error processing documents: {str(e)}")

    def get_config(self) -> Dict[str, Any]:
        """Get the current vector index configuration."""
        return self.config.copy()

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the vector index."""
        return {
            "id": self.index_id,
            "has_embeddings": self.embeddings_dir.exists() and any(self.embeddings_dir.iterdir()),
            "config": self.get_config()
        }