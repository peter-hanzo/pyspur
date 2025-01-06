import os

from backend.app.rag.datastore.datastore import DataStore


async def get_datastore(datastore: str) -> DataStore:
    assert datastore is not None

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
                f"Try one of the following: llama, elasticsearch, pinecone, weaviate, milvus, zilliz, redis, azuresearch, or qdrant"
            )
