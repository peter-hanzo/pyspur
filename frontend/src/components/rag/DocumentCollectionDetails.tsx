import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@nextui-org/react';
import {
  getDocumentCollection,
  addDocumentsToCollection,
  deleteDocumentCollection,
} from '@/utils/api';
import type { DocumentCollectionResponse } from '@/utils/api';

export const DocumentCollectionDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [collection, setCollection] = useState<DocumentCollectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingDocuments, setIsAddingDocuments] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        if (!id || typeof id !== 'string') return;
        const data = await getDocumentCollection(id);
        setCollection(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching collection:', error);
        setError('Error loading collection details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollection();
  }, [id]);

  const handleDelete = async () => {
    try {
      if (!id || typeof id !== 'string') return;
      setIsDeleting(true);
      await deleteDocumentCollection(id);
      router.push('/rag');
    } catch (error) {
      console.error('Error deleting collection:', error);
      setError('Error deleting collection');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddDocuments = async (files: FileList) => {
    try {
      if (!id || typeof id !== 'string') return;
      setIsAddingDocuments(true);
      await addDocumentsToCollection(id, Array.from(files));
      setSuccess('Documents added successfully');
      // Refresh collection details
      const data = await getDocumentCollection(id);
      setCollection(data);
      setError(null);
    } catch (error) {
      console.error('Error adding documents:', error);
      setError('Error adding documents');
      setSuccess(null);
    } finally {
      setIsAddingDocuments(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  if (!collection) {
    return (
      <Card className="bg-danger-50">
        <CardBody>
          <p className="text-danger">Collection not found</p>
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

      {success && (
        <Card className="bg-success-50">
          <CardBody>
            <p className="text-success">{success}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h4 className="text-large font-bold">{collection.name}</h4>
              <div className="flex gap-2">
                <Button
                  color="primary"
                  variant="bordered"
                  isLoading={isAddingDocuments}
                  onPress={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) {
                        handleAddDocuments(files);
                      }
                    };
                    input.click();
                  }}
                >
                  Add Documents
                </Button>
                <Button
                  color="primary"
                  onPress={() => router.push(`/rag/indices/new?collection=${id}`)}
                >
                  Create Index
                </Button>
                <Button
                  color="danger"
                  variant="bordered"
                  onPress={onOpen}
                >
                  Delete
                </Button>
              </div>
            </div>

            {collection.description && (
              <p className="text-default-500">{collection.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Status</h6>
                    <p className="text-default-500">{collection.status}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Documents</h6>
                    <p className="text-default-500">{collection.document_count}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Chunks</h6>
                    <p className="text-default-500">{collection.chunk_count}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold">Created</h6>
                    <p className="text-default-500">
                      {new Date(collection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {collection.error_message && (
              <Card className="bg-danger-50">
                <CardBody>
                  <div className="flex flex-col gap-1">
                    <h6 className="text-medium font-semibold text-danger">Error</h6>
                    <p className="text-danger-600">{collection.error_message}</p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Delete Collection</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete this collection? This action cannot be undone.</p>
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