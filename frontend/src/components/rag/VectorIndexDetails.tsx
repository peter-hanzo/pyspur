import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  Spinner,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Divider,
  Progress,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
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
          <div className="flex items-center gap-2">
            <Icon icon="solar:danger-circle-bold" className="text-danger" width={20} />
            <p className="text-danger">Index not found</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return 'solar:check-circle-linear';
      case 'failed':
        return 'solar:danger-circle-linear';
      default:
        return 'solar:clock-circle-linear';
    };
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card className="bg-danger-50">
          <CardBody>
            <div className="flex items-center gap-2">
              <Icon icon="solar:danger-circle-bold" className="text-danger" width={20} />
              <p className="text-danger">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="shadow-small">
        <CardBody>
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-bold">{index.name}</h4>
                {index.description && (
                  <p className="text-default-500">{index.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  color="danger"
                  variant="light"
                  startContent={<Icon icon="solar:trash-bin-trash-linear" width={20} />}
                  onPress={onOpen}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div>
              <p className="text-medium mb-2">
                Collection:{' '}
                <Link
                  as="button"
                  onPress={() => router.push(`/rag/collections/${index.collection_id}`)}
                  className="text-primary"
                >
                  {collection?.name || index.collection_id}
                </Link>
              </p>
            </div>

            <div className="flex gap-4">
              <Chip color={getStatusColor(index.status)} variant="flat" size="sm">
                <div className="flex items-center gap-1">
                  <Icon icon={getStatusIcon(index.status)} width={16} />
                  <span className="capitalize">{index.status}</span>
                </div>
              </Chip>
              <Chip variant="flat" size="sm">
                <div className="flex items-center gap-1">
                  <Icon icon="solar:documents-linear" width={16} />
                  <span>{index.document_count} Documents</span>
                </div>
              </Chip>
              <Chip variant="flat" size="sm">
                <div className="flex items-center gap-1">
                  <Icon icon="solar:layers-linear" width={16} />
                  <span>{index.chunk_count} Chunks</span>
                </div>
              </Chip>
            </div>

            <Divider />

            {index.status === 'processing' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processing Documents</span>
                    <span className="text-sm text-default-400">50%</span>
                  </div>
                  <Progress
                    value={50}
                    color="primary"
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Documents Processed</span>
                    <span>{Math.floor(index.document_count / 2)} / {index.document_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>Chunks Processed</span>
                    <span>{Math.floor(index.chunk_count / 2)} / {index.chunk_count}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-default-400">
                  <Spinner size="sm" />
                  <span>Processing your documents...</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Embedding Model</h6>
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:cpu-linear" width={16} className="text-default-500" />
                      <p className="text-default-500">{index.embedding_model}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Vector Database</h6>
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:database-linear" width={16} className="text-default-500" />
                      <p className="text-default-500">{index.vector_db}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {index.error_message && (
              <Card className="bg-danger-50">
                <CardBody>
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:danger-triangle-linear" className="text-danger" width={20} />
                    <div className="flex flex-col gap-1">
                      <h6 className="text-medium font-semibold text-danger">Error</h6>
                      <p className="text-danger-600">{index.error_message}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <Icon icon="solar:danger-triangle-bold" className="text-danger" width={24} />
            Delete Vector Index
          </ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete this vector index? This action cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              startContent={<Icon icon="solar:trash-bin-trash-bold" width={20} />}
              isLoading={isDeleting}
              onPress={handleDelete}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};