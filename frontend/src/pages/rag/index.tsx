import React from 'react'
import Header from '../../components/Header'
import KnowledgeBases from '../../components/KnowledgeBases'

const RAGPage: React.FC = () => {
  return (
    <div className="App relative">
      <Header activePage="rag" />
      <KnowledgeBases />
    </div>
  )
}

export default RAGPage