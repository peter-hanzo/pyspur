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
        "milvus": VectorStoreConfig(
            id="milvus",
            name="Milvus",
            description="Open-source vector database",
        ),
        "zilliz": VectorStoreConfig(
            id="zilliz",
            name="Zilliz",
            description="Cloud-native vector database",
            api_key_env_var="ZILLIZ_API_KEY",
        ),
        "redis": VectorStoreConfig(
            id="redis",
            name="Redis",
            description="In-memory vector database",
            api_key_env_var="REDIS_API_KEY",
        ),
        "qdrant": VectorStoreConfig(
            id="qdrant",
            name="Qdrant",
            description="Vector database for production",
            api_key_env_var="QDRANT_API_KEY",
        ),
        "azuresearch": VectorStoreConfig(
            id="azuresearch",
            name="Azure Cognitive Search",
            description="Azure's vector search service",
            api_key_env_var="AZURE_SEARCH_API_KEY",
        ),
        "elasticsearch": VectorStoreConfig(
            id="elasticsearch",
            name="Elasticsearch",
            description="Search engine with vector support",
            api_key_env_var="ELASTICSEARCH_API_KEY",
        ),
        "mongodb": VectorStoreConfig(
            id="mongodb",
            name="MongoDB Atlas",
            description="Document database with vector search",
            api_key_env_var="MONGODB_API_KEY",
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
            from backend.app.rag.datastore.providers.chroma_datastore import (
                ChromaDataStore,
            )

            return ChromaDataStore()
        case "llama":
            from backend.app.rag.datastore.providers.llama_datastore import (
                LlamaDataStore,
            )

            return LlamaDataStore()

        case "pinecone":
            from backend.app.rag.datastore.providers.pinecone_datastore import (
                PineconeDataStore,
            )

            return PineconeDataStore()
        case "weaviate":
            from backend.app.rag.datastore.providers.weaviate_datastore import (
                WeaviateDataStore,
            )

            return WeaviateDataStore()
        case "milvus":
            from backend.app.rag.datastore.providers.milvus_datastore import (
                MilvusDataStore,
            )

            return MilvusDataStore()
        case "zilliz":
            from backend.app.rag.datastore.providers.zilliz_datastore import (
                ZillizDataStore,
            )

            return ZillizDataStore()
        case "redis":
            from backend.app.rag.datastore.providers.redis_datastore import (
                RedisDataStore,
            )

            return await RedisDataStore.init()
        case "azurecosmosdb":
            from backend.app.rag.datastore.providers.azurecosmosdb_datastore import (
                AzureCosmosDBDataStore,
            )

            return await AzureCosmosDBDataStore.create()
        case "qdrant":
            from backend.app.rag.datastore.providers.qdrant_datastore import (
                QdrantDataStore,
            )

            return QdrantDataStore()
        case "azuresearch":
            from backend.app.rag.datastore.providers.azuresearch_datastore import (
                AzureSearchDataStore,
            )

            return AzureSearchDataStore()
        case "supabase":
            from backend.app.rag.datastore.providers.supabase_datastore import (
                SupabaseDataStore,
            )

            return SupabaseDataStore()
        case "postgres":
            from backend.app.rag.datastore.providers.postgres_datastore import (
                PostgresDataStore,
            )

            return PostgresDataStore()
        case "analyticdb":
            from backend.app.rag.datastore.providers.analyticdb_datastore import (
                AnalyticDBDataStore,
            )

            return AnalyticDBDataStore()
        case "elasticsearch":
            from backend.app.rag.datastore.providers.elasticsearch_datastore import (
                ElasticsearchDataStore,
            )

            return ElasticsearchDataStore()
        case "mongodb":
            from backend.app.rag.datastore.providers.mongodb_atlas_datastore import (
                MongoDBAtlasDataStore,
            )

            return MongoDBAtlasDataStore()
        case _:
            raise ValueError(
                f"Unsupported vector database: {datastore}. "
                f"Try one of the following: {', '.join(vector_stores.keys())}"
            )
