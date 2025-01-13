import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Tab,
  Tabs,
} from '@nextui-org/react';
import {
  listDocumentCollections,
  listVectorIndices,
} from '@/utils/api';
import type { DocumentCollectionResponse, VectorIndexResponse } from '@/utils/api';

export const KnowledgeBases: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('collections');
  const [collections, setCollections] = useState<DocumentCollectionResponse[]>([]);
  const [indices, setIndices] = useState<VectorIndexResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [collectionsData, indicesData] = await Promise.all([
          listDocumentCollections(),
          listVectorIndices(),
        ]);
        setCollections(collectionsData);
        setIndices(indicesData);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderCollectionCard = (collection: DocumentCollectionResponse) => (
    <Card
      key={collection.id}
      isPressable
      onPress={() => router.push(`/rag/collections/${collection.id}`)}
      className="w-full"
    >
      <CardBody>
        <div className="flex flex-col gap-2">
          <h4 className="text-large font-bold">{collection.name}</h4>
          {collection.description && (
            <p className="text-small text-default-500">{collection.description}</p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-small">Documents: {collection.document_count}</p>
            <p className="text-small">Chunks: {collection.chunk_count}</p>
            <p className="text-small">Status: {collection.status}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const renderIndexCard = (index: VectorIndexResponse) => (
    <Card
      key={index.id}
      isPressable
      onPress={() => router.push(`/rag/indices/${index.id}`)}
      className="w-full"
    >
      <CardBody>
        <div className="flex flex-col gap-2">
          <h4 className="text-large font-bold">{index.name}</h4>
          {index.description && (
            <p className="text-small text-default-500">{index.description}</p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-small">Documents: {index.document_count}</p>
            <p className="text-small">Chunks: {index.chunk_count}</p>
            <p className="text-small">Status: {index.status}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card className="bg-danger-50">
          <CardBody>
            <p className="text-danger">{error}</p>
          </CardBody>
        </Card>
      )}

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key.toString())}
      >
        <Tab key="collections" title="Document Collections">
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <Button
                color="primary"
                onPress={() => router.push('/rag/collections/new')}
              >
                Create Collection
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.length > 0 ? (
                collections.map(renderCollectionCard)
              ) : (
                <p className="text-default-500">
                  No document collections found. Create one to get started.
                </p>
              )}
            </div>
          </div>
        </Tab>
        <Tab key="indices" title="Vector Indices">
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <Button
                color="primary"
                onPress={() => router.push('/rag/indices/new')}
              >
                Create Index
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indices.length > 0 ? (
                indices.map(renderIndexCard)
              ) : (
                <p className="text-default-500">
                  No vector indices found. Create one to get started.
                </p>
              )}
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};