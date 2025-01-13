import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@nextui-org/react';
import {
  getVectorIndex,
  deleteVectorIndex,
  getDocumentCollection,
} from '@/utils/api';
import type { VectorIndexResponse, DocumentCollectionResponse } from '@/utils/api';

export const VectorIndexDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [index, setIndex] = useState<VectorIndexResponse | null>(null);
  const [collection, setCollection] = useState<DocumentCollectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id || typeof id !== 'string') return;
        const indexData = await getVectorIndex(id);
        setIndex(indexData);
        const collectionData = await getDocumentCollection(indexData.collection_id);
        setCollection(collectionData);
        setError(null);
      } catch (error) {
        console.error('Error fetching index:', error);
        setError('Error loading index details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    try {
      if (!id || typeof id !== 'string') return;
      setIsDeleting(true);
      await deleteVectorIndex(id);
      router.push('/rag');
    } catch (error) {
      console.error('Error deleting index:', error);
      setError('Error deleting index');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  if (!index) {
    return (
      <Card className="bg-danger-50">
        <CardBody>
          <p className="text-danger">Index not found</p>
        </CardBody>
      </Card>
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

      <Card>
        <CardBody>
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h4 className="text-large font-bold">{index.name}</h4>
              <div className="flex gap-2">
                <Button
                  color="danger"
                  variant="bordered"
                  onPress={onOpen}
                >
                  Delete
                </Button>
              </div>
            </div>

            {index.description && (
              <p className="text-default-500">{index.description}</p>
            )}

            <div>
              <p className="text-medium mb-2">
                Collection:{' '}
                <Link
                  as="button"
                  onPress={() => router.push(`/rag/collections/${index.collection_id}`)}
                >
                  {collection?.name || index.collection_id}
                </Link>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Status</h6>
                    <p className="text-default-500">{index.status}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Documents</h6>
                    <p className="text-default-500">{index.document_count}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Chunks</h6>
                    <p className="text-default-500">{index.chunk_count}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Created</h6>
                    <p className="text-default-500">
                      {new Date(index.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Embedding Model</h6>
                    <p className="text-default-500">{index.embedding_model}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Vector Database</h6>
                    <p className="text-default-500">{index.vector_db}</p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {index.error_message && (
              <Card className="bg-danger-50">
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold text-danger">Error</h6>
                    <p className="text-danger-600">{index.error_message}</p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Delete Index</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete this vector index? This action cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onClose}>
              Cancel
            </Button>
            <Button color="danger" isLoading={isDeleting} onPress={handleDelete}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};