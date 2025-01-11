from typing import Dict, Optional
from pydantic import BaseModel

from .datastore import DataStore


class VectorStoreConfig(BaseModel):
    id: str
    name: str
    description: str
    api_key_env_var: Optional[str] = None


def get_vector_stores() -> Dict[str, VectorStoreConfig]:
    """Get all available vector stores and their configurations."""
    return {
        "chroma": VectorStoreConfig(
            id="chroma",
            name="Chroma",
            description="Open-source embedding database",
        ),
        "pinecone": VectorStoreConfig(
            id="pinecone",
            name="Pinecone",
            description="Production-ready vector database",
            api_key_env_var="PINECONE_API_KEY",
        ),
        "weaviate": VectorStoreConfig(
            id="weaviate",
            name="Weaviate",
            description="Multi-modal vector search engine",
            api_key_env_var="WEAVIATE_API_KEY",
        ),
        "supabase": VectorStoreConfig(
            id="supabase",
            name="Supabase",
            description="Open-source vector database",
        ),

        "qdrant": VectorStoreConfig(
            id="qdrant",
            name="Qdrant",
            description="Vector database for production",
            api_key_env_var="QDRANT_API_KEY",
        ),

    }


async def get_datastore(datastore: str) -> DataStore:
    """Initialize and return a DataStore instance for the specified vector database."""
    assert datastore is not None

    # Validate the datastore is supported
    vector_stores = get_vector_stores()
    if datastore not in vector_stores:
        raise ValueError(
            f"Unsupported vector database: {datastore}. "
            f"Try one of the following: {', '.join(vector_stores.keys())}"
        )

    match datastore:
        case "chroma":
            from .providers.chroma_datastore import (
                ChromaDataStore,
            )

            return ChromaDataStore()


        case "pinecone":
            from .providers.pinecone_datastore import (
                PineconeDataStore,
            )

            return PineconeDataStore()
        case "weaviate":
            from .providers.weaviate_datastore import (
                WeaviateDataStore,
            )

            return WeaviateDataStore()

        case "qdrant":
            from .providers.qdrant_datastore import (
                QdrantDataStore,
            )

            return QdrantDataStore()

        case "supabase":
            from .providers.supabase_datastore import (
                SupabaseDataStore,
            )

            return SupabaseDataStore()
        case _:
            raise ValueError(
                f"Unsupported vector database: {datastore}. "
                f"Try one of the following: {', '.join(vector_stores.keys())}"
            )
