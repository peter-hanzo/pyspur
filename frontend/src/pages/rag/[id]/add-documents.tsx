import React from 'react'
import { useRouter } from 'next/router'
import AddDocumentsWizard from '@/components/rag/AddDocumentsWizard'
import Header from '@/components/Header'

const AddDocumentsPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') {
    return null
  }

  return (
    <div className="App relative">
      <Header activePage="rag" />
      <AddDocumentsWizard knowledgeBaseId={id} />
    </div>
  )
}

export default AddDocumentsPage