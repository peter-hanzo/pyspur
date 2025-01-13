from typing import List, Dict, Any, Optional, Callable, Coroutine
from pathlib import Path
import json

from .document_store import DocumentStore
from .vector_index import VectorIndex
from .models.document_schemas import DocumentWithChunks


class KnowledgeBase:
    """Manages the entire knowledge base lifecycle."""

    def __init__(self, kb_id: str):
        """Initialize knowledge base manager."""
        self.kb_id = kb_id
        self.doc_store = DocumentStore(kb_id)
        self.base_dir = Path(f"data/knowledge_bases/{kb_id}")
        self.config_path = self.base_dir / "config.json"

        # Create base directory
        self.base_dir.mkdir(parents=True, exist_ok=True)

        # Load or create config
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load knowledge base configuration."""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        return {}

    def _save_config(self) -> None:
        """Save knowledge base configuration."""
        with open(self.config_path, "w") as f:
            json.dump(self.config, f, indent=2)

    def update_config(self, config: Dict[str, Any]) -> None:
        """Update knowledge base configuration."""
        self.config.update(config)
        self._save_config()

    async def process_documents(
        self,
        files: List[Dict[str, Any]],
        config: Dict[str, Any],
        on_progress: Optional[Callable[[float, str, int, int], Coroutine[Any, Any, None]]] = None,
    ) -> List[DocumentWithChunks]:
        """
        Process documents and store them in the document store.

        Args:
            files: List of file information
            config: Processing configuration
            on_progress: Progress callback

        Returns:
            List[DocumentWithChunks]: Processed documents with chunks
        """
        # Update config
        self.update_config(config)

        # Process documents
        return await self.doc_store.process_documents(files, config, on_progress)

    async def create_vector_index(
        self,
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[float, str, int, int], Coroutine[Any, Any, None]]] = None,
    ) -> str:
        """
        Create a vector index from the document collection.

        Args:
            config: Optional embedding configuration (falls back to stored config)
            on_progress: Progress callback

        Returns:
            str: Vector index ID
        """
        # Use stored config if none provided
        if config:
            self.update_config(config)

        # Create vector index
        vector_index = VectorIndex(self.kb_id)
        return await vector_index.create_from_document_collection(self.kb_id, self.config, on_progress)

    def get_document(self, doc_id: str) -> Optional[DocumentWithChunks]:
        """Get a document from the document store."""
        return self.doc_store.get_document(doc_id)

    def list_documents(self) -> List[str]:
        """List all document IDs in the knowledge base."""
        return self.doc_store.list_documents()

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document from the knowledge base."""
        return self.doc_store.delete_document(doc_id)

    def get_config(self) -> Dict[str, Any]:
        """Get the current knowledge base configuration."""
        return self.config.copy()

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the knowledge base."""
        doc_ids = self.list_documents()
        vector_index = VectorIndex(self.kb_id)
        vector_index_status = vector_index.get_status()

        return {
            "id": self.kb_id,
            "document_count": len(doc_ids),
            "has_embeddings": vector_index_status["has_embeddings"],
            "config": self.get_config()
        }