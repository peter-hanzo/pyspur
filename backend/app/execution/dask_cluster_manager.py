from dask.distributed import Client, LocalCluster
from scipy import cluster


class DaskClusterManager:
    _client = None
    _cluster = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._cluster = LocalCluster()
            cls._client = Client(cls._cluster, asynchronous=True)
        return cls._client

    @classmethod
    def shutdown(cls):
        if cls._client is not None:
            cls._client.shutdown()
            cls._client = None
            cls._cluster = None
