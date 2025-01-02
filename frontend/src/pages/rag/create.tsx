import React from 'react'
import Header from '../../components/Header'
import KnowledgeBaseWizard from '../../components/rag/KnowledgeBaseWizard'

const CreateKnowledgeBasePage: React.FC = () => {
  return (
    <div className="App relative">
      <Header activePage="rag" />
      <KnowledgeBaseWizard />
    </div>
  )
}

export default CreateKnowledgeBasePage