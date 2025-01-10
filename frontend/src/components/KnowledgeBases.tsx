import React, { useState, useEffect } from 'react'
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
} from '@nextui-org/react'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/router'
import { listKnowledgeBases, deleteKnowledgeBase, KnowledgeBaseResponse } from '@/utils/api'

const KnowledgeBases: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      setIsLoading(true)
      const data = await listKnowledgeBases()
      setKnowledgeBases(data)
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKnowledgeBase = () => {
    router.push('/rag/create')
  }

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this knowledge base?')) {
      try {
        await deleteKnowledgeBase(id)
        await fetchKnowledgeBases()
      } catch (error) {
        console.error('Error deleting knowledge base:', error)
      }
    }
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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'documentCount', label: 'Documents' },
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

  return (
    <div className="w-3/4 mx-auto p-5">
      <header className="mb-6 flex w-full items-center flex-col gap-2">
        <div className="flex w-full items-center">
          <div className="flex flex-col max-w-fit">
            <h1 className="text-xl font-bold text-default-900 lg:text-3xl">Knowledge Bases</h1>
            <p className="text-small text-default-400 lg:text-medium">Manage your RAG knowledge bases</p>
          </div>
          <div className="ml-auto">
            <Button
              className="bg-foreground text-background"
              startContent={<Icon className="flex-none text-background/60" icon="lucide:plus" width={16} />}
              onPress={handleCreateKnowledgeBase}
            >
              New Knowledge Base
            </Button>
          </div>
        </div>
      </header>

      <Table aria-label="Knowledge Bases" isHeaderSticky>
        <TableHeader columns={columns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={knowledgeBases} emptyContent="No knowledge bases found">
          {(item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Chip size="sm" variant="flat" className="cursor-pointer">
                  {item.name}
                </Chip>
              </TableCell>
              <TableCell>{item.description || '-'}</TableCell>
              <TableCell>{item.document_count}</TableCell>
              <TableCell>{formatDate(item.updated_at)}</TableCell>
              <TableCell>
                <Chip size="sm" color={getStatusColor(item.status)} variant="flat">
                  {item.status}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:pen-bold"
                    className="cursor-pointer text-default-400"
                    height={18}
                    width={18}
                    onClick={() => { }}
                  />
                  <Icon
                    icon="solar:trash-bin-trash-bold"
                    className="cursor-pointer text-default-400"
                    height={18}
                    width={18}
                    onClick={() => handleDeleteKnowledgeBase(item.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Create Knowledge Base</ModalHeader>
              <ModalBody>
                <Input label="Name" placeholder="Enter knowledge base name" />
                <Input label="Description" placeholder="Enter description" />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={onClose}>
                  Create
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

export default KnowledgeBases