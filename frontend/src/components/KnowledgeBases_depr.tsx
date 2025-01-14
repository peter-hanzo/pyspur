import React, { useState, useEffect, useRef } from 'react'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
  Chip,
  Spinner,
  Selection,
  Progress,
  useButton,
  Tabs,
  Tab,
  Card,
  CardBody,
  Divider,
} from '@nextui-org/react'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/router'
import { listKnowledgeBases, deleteKnowledgeBase, KnowledgeBaseResponse } from '@/utils/api'

interface DocumentCollection {
  id: string
  name: string
  description: string
  document_count: number
  chunk_count: number
  created_at: string
  updated_at: string
  status: 'ready' | 'processing' | 'failed'
  error_message?: string
  has_embeddings: boolean
  config?: {
    chunk_token_size?: number
    embeddings_batch_size?: number
  }
}

interface VectorIndex extends DocumentCollection {
  vector_db: string
  embedding_model: string
}

const KnowledgeBases: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [documentCollections, setDocumentCollections] = useState<DocumentCollection[]>([])
  const [vectorIndices, setVectorIndices] = useState<VectorIndex[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]))
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number; isDeleting: boolean }>({
    current: 0,
    total: 0,
    isDeleting: false,
  })
  const router = useRouter()

  // Add button refs and useButton hooks
  const uploadRef = useRef<HTMLButtonElement | null>(null)
  const deleteRef = useRef<HTMLButtonElement | null>(null)
  const {getButtonProps: getUploadProps} = useButton({ref: uploadRef})
  const {getButtonProps: getDeleteProps} = useButton({ref: deleteRef})

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      setIsLoading(true)
      const data = await listKnowledgeBases()

      // Split into document collections and vector indices
      const collections: DocumentCollection[] = []
      const indices: VectorIndex[] = []

      data.forEach((kb: KnowledgeBaseResponse) => {
        if (kb.has_embeddings && kb.config?.vector_db && kb.config?.embedding_model) {
          indices.push({
            ...kb,
            vector_db: kb.config.vector_db,
            embedding_model: kb.config.embedding_model
          })
        } else {
          collections.push(kb)
        }
      })

      setDocumentCollections(collections)
      setVectorIndices(indices)
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCollection = () => {
    router.push('/rag/create')
  }

  const handleDeleteCollection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document collection?')) {
      try {
        await deleteKnowledgeBase(id)
        await fetchKnowledgeBases()
      } catch (error) {
        console.error('Error deleting document collection:', error)
      }
    }
  }

  const handleDeleteIndex = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vector index?')) {
      try {
        await deleteKnowledgeBase(id)
        await fetchKnowledgeBases()
      } catch (error) {
        console.error('Error deleting vector index:', error)
      }
    }
  }

  const handleCreateIndex = async (collectionId: string) => {
    router.push(`/rag/${collectionId}/create-index`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success'
      case 'processing':
        return 'warning'
      case 'failed':
        return 'danger'
      default:
        return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const collectionColumns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'documentCount', label: 'Documents' },
    { key: 'chunkCount', label: 'Chunks' },
    { key: 'lastUpdated', label: 'Last Updated' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const indexColumns = [
    { key: 'name', label: 'Name' },
    { key: 'vectorDb', label: 'Vector DB' },
    { key: 'embeddingModel', label: 'Embedding Model' },
    { key: 'documentCount', label: 'Documents' },
    { key: 'chunkCount', label: 'Chunks' },
    { key: 'lastUpdated', label: 'Last Updated' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  if (isLoading) {
    return (
      <div className="w-3/4 mx-auto p-5 flex justify-center items-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const renderDocumentCollectionsTable = () => (
    <Card>
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Document Collections</h2>
            <p className="text-small text-default-400">Manage your parsed and chunked documents</p>
          </div>
          <Button
            className="bg-foreground text-background"
            startContent={<Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />}
            onPress={handleCreateCollection}
          >
            New Collection
          </Button>
        </div>
        <Table
          aria-label="Document Collections"
          isHeaderSticky
          classNames={{
            base: "max-h-[400px] overflow-scroll",
          }}
        >
          <TableHeader columns={collectionColumns}>
            {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
          </TableHeader>
          <TableBody items={documentCollections} emptyContent="No document collections found">
            {(item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Chip size="sm" variant="flat" className="cursor-pointer">
                    {item.name}
                  </Chip>
                </TableCell>
                <TableCell>{item.description || '-'}</TableCell>
                <TableCell>{item.document_count}</TableCell>
                <TableCell>{item.chunk_count}</TableCell>
                <TableCell>{formatDate(item.updated_at)}</TableCell>
                <TableCell>
                  <Chip size="sm" color={getStatusColor(item.status)} variant="flat">
                    {item.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => handleCreateIndex(item.id)}
                    >
                      <Icon
                        icon="solar:graph-new-bold"
                        className="text-default-400"
                        height={18}
                        width={18}
                      />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => router.push(`/rag/${item.id}/add-documents`)}
                    >
                      <Icon
                        icon="solar:upload-bold"
                        className="text-default-400"
                        height={18}
                        width={18}
                      />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => handleDeleteCollection(item.id)}
                    >
                      <Icon
                        icon="solar:trash-bin-trash-bold"
                        className="text-default-400"
                        height={18}
                        width={18}
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  )

  const renderVectorIndicesTable = () => (
    <Card>
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Vector Indices</h2>
            <p className="text-small text-default-400">Manage your embedded document collections</p>
          </div>
        </div>
        <Table
          aria-label="Vector Indices"
          isHeaderSticky
          classNames={{
            base: "max-h-[400px] overflow-scroll",
          }}
        >
          <TableHeader columns={indexColumns}>
            {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
          </TableHeader>
          <TableBody items={vectorIndices} emptyContent="No vector indices found">
            {(item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Chip size="sm" variant="flat" className="cursor-pointer">
                    {item.name}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color="primary">
                    {item.vector_db}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color="secondary">
                    {item.embedding_model}
                  </Chip>
                </TableCell>
                <TableCell>{item.document_count}</TableCell>
                <TableCell>{item.chunk_count}</TableCell>
                <TableCell>{formatDate(item.updated_at)}</TableCell>
                <TableCell>
                  <Chip size="sm" color={getStatusColor(item.status)} variant="flat">
                    {item.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => handleDeleteIndex(item.id)}
                    >
                      <Icon
                        icon="solar:trash-bin-trash-bold"
                        className="text-default-400"
                        height={18}
                        width={18}
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  )

  return (
    <div className="w-3/4 mx-auto p-5">
      <header className="mb-6">
        <div className="flex flex-col max-w-fit">
          <h1 className="text-xl font-bold text-default-900 lg:text-3xl">Knowledge Base Management</h1>
          <p className="text-small text-default-400 lg:text-medium">Manage your RAG document collections and vector indices</p>
        </div>
      </header>

      <div className="space-y-6">
        {renderDocumentCollectionsTable()}
        {renderVectorIndicesTable()}
      </div>

      <Modal
        isOpen={deleteProgress.isDeleting}
        hideCloseButton
        isDismissable={false}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Deleting Knowledge Base
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Progress
                size="md"
                value={(deleteProgress.current / deleteProgress.total) * 100}
                color="danger"
                showValueLabel={true}
                classNames={{
                  label: "text-sm font-medium text-default-500",
                  value: "text-sm font-medium text-default-500",
                }}
              />
              <p className="text-sm text-center text-default-500">
                Deleting {deleteProgress.current} of {deleteProgress.total} items...
              </p>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default KnowledgeBases