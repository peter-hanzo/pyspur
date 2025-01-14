import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  Spinner,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import {
  listDocumentCollections,
  listVectorIndices,
} from '@/utils/api';
import type { DocumentCollectionResponse, VectorIndexResponse } from '@/utils/api';
import DocumentCollectionCard from '../cards/DocumentCollectionCard';
import VectorIndexCard from '../cards/VectorIndexCard';

export const KnowledgeBases: React.FC = () => {
  const router = useRouter();
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
        // Sort collections by created_at in descending order
        const sortedCollections = [...collectionsData].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        // Sort indices by created_at in descending order
        const sortedIndices = [...indicesData].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setCollections(sortedCollections);
        setIndices(sortedIndices);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="w-3/4 mx-auto p-5">
        {error && (
          <Card className="bg-danger-50 mb-6">
            <CardBody>
              <p className="text-danger">{error}</p>
            </CardBody>
          </Card>
        )}

        {/* Dashboard Header */}
        <header className="mb-6 flex w-full items-center flex-col gap-2">
          <div className="flex w-full items-center">
            <div className="flex flex-col max-w-fit">
              <h1 className="text-xl font-bold text-default-900 lg:text-3xl">Knowledge Bases</h1>
              <p className="text-small text-default-400 lg:text-medium">Manage your document collections and vector indices</p>
            </div>
          </div>
        </header>

        {/* Document Collections Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Document Collections</h2>
            <Button
              className="bg-foreground text-background"
              startContent={<Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />}
              onPress={() => router.push('/rag/collections/new')}
            >
              Create Collection
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.length > 0 ? (
              collections.map((collection) => (
                <DocumentCollectionCard
                  key={collection.id}
                  collection={collection}
                  onClick={(id) => router.push(`/rag/collections/${id}`)}
                />
              ))
            ) : (
              <p className="text-default-500">
                No document collections found. Create one to get started.
              </p>
            )}
          </div>
        </section>

        {/* Vector Indices Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Vector Indices</h2>
            <Button
              className="bg-foreground text-background"
              startContent={<Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />}
              onPress={() => router.push('/rag/indices/new')}
            >
              Create Index
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {indices.length > 0 ? (
              indices.map((index) => (
                <VectorIndexCard
                  key={index.id}
                  index={index}
                  onClick={(id) => router.push(`/rag/indices/${id}`)}
                />
              ))
            ) : (
              <p className="text-default-500">
                No vector indices found. Create one to get started.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};