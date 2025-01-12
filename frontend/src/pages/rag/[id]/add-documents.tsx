import React from 'react'
import { useRouter } from 'next/router'
import AddDocumentsWizard from '@/components/rag/AddDocumentsWizard'

const AddDocumentsPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') {
    return null
  }

  return <AddDocumentsWizard knowledgeBaseId={id} />
}

export default AddDocumentsPage