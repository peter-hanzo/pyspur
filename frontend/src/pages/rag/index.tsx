import React from 'react';
import Header from '@/components/Header';
import { KnowledgeBases } from '@/components/rag/KnowledgeBases';

export default function RAGPage() {
  return (
    <div className="App relative">
      <Header activePage="rag" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Knowledge Bases</h1>
        <KnowledgeBases />
      </div>
    </div>
  );
}