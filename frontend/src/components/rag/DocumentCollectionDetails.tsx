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
  Accordion,
  AccordionItem,
} from '@nextui-org/react';
import {
  getDocumentCollection,
  addDocumentsToCollection,
  deleteDocumentCollection,
  getCollectionDocuments,
} from '@/utils/api';
import type { DocumentCollectionResponse, DocumentWithChunks } from '@/utils/api';
import FileUploadBox from './FileUploadBox';
import ChunkCard from '../cards/ChunkCard';

export const DocumentCollectionDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddDocumentsOpen,
    onOpen: onAddDocumentsOpen,
    onClose: onAddDocumentsClose
  } = useDisclosure();
  const {
    isOpen: isDocumentTextOpen,
    onOpen: onDocumentTextOpen,
    onClose: onDocumentTextClose
  } = useDisclosure();
  const {
    isOpen: isChunkTextOpen,
    onOpen: onChunkTextOpen,
    onClose: onChunkTextClose
  } = useDisclosure();
  const [collection, setCollection] = useState<DocumentCollectionResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentWithChunks[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithChunks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingDocuments, setIsAddingDocuments] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<{ text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id || typeof id !== 'string') return;
        const [collectionData, documentsData] = await Promise.all([
          getDocumentCollection(id),
          getCollectionDocuments(id),
        ]);
        setCollection(collectionData);
        setDocuments(documentsData);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading collection data');
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

  const handleAddDocuments = async (files: FileList | File[]) => {
    try {
      if (!id || typeof id !== 'string') return;
      setIsAddingDocuments(true);
      setError(null);
      await addDocumentsToCollection(id, Array.from(files));
      setSuccess('Documents added successfully');
      // Refresh data
      const [collectionData, documentsData] = await Promise.all([
        getDocumentCollection(id),
        getCollectionDocuments(id),
      ]);
      setCollection(collectionData);
      setDocuments(documentsData);
      setError(null);
      // Close modal and reset state
      onAddDocumentsClose();
      setSelectedFiles([]);
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
                  onPress={onAddDocumentsOpen}
                >
                  Add Documents
                </Button>
                <Button
                  color="primary"
                  onPress={() => router.push(`/rag/indices/new?collection=${id}`)}
                >
                  Create Vector Index
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

            {documents.length === 0 ? (
              <Card className="bg-default-50">
                <CardBody className="py-8">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-default-500">No documents in this collection yet</p>
                    <Button
                      color="primary"
                      variant="bordered"
                      isLoading={isAddingDocuments}
                      onPress={onAddDocumentsOpen}
                    >
                      Add Your First Document
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Accordion>
                {documents.map((doc) => (
                  <AccordionItem
                    key={doc.id}
                    aria-label={`Document ${doc.metadata?.source_id || doc.id}`}
                    title={
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {doc.metadata?.source_id || doc.id}
                        </span>
                        <div className="flex items-center gap-4">
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setSelectedDocument(doc);
                              onDocumentTextOpen();
                            }}
                          >
                            View Document
                          </Button>
                          <span className="text-small text-default-500">
                            {doc.chunks.length} chunks
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-4 p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doc.chunks.map((chunk) => (
                          <ChunkCard
                            key={chunk.id}
                            text={chunk.text}
                            onViewFull={() => {
                              setSelectedChunk(chunk);
                              onChunkTextOpen();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

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

      <Modal
        isOpen={isAddDocumentsOpen}
        onClose={onAddDocumentsClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Add Documents</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <h6 className="text-medium font-semibold">Upload Documents</h6>
                  <p className="text-small text-default-500">
                    Select documents to add to your collection. The documents will be processed using the collection's existing configuration.
                  </p>
                </div>

                <FileUploadBox onFilesChange={setSelectedFiles} />
              </div>

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
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onAddDocumentsClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isAddingDocuments}
              isDisabled={selectedFiles.length === 0}
              onPress={() => handleAddDocuments(selectedFiles)}
            >
              Add Documents
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isDocumentTextOpen}
        onClose={onDocumentTextClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Document Text</ModalHeader>
          <ModalBody>
            <Card>
              <CardBody>
                <p className="whitespace-pre-wrap text-small">
                  {selectedDocument?.text}
                </p>
              </CardBody>
            </Card>
          </ModalBody>
          <ModalFooter>
            <Button onPress={onDocumentTextClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isChunkTextOpen}
        onClose={onChunkTextClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Chunk Text</ModalHeader>
          <ModalBody>
            <Card>
              <CardBody>
                <p className="whitespace-pre-wrap text-small">
                  {selectedChunk?.text}
                </p>
              </CardBody>
            </Card>
          </ModalBody>
          <ModalFooter>
            <Button onPress={onChunkTextClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};