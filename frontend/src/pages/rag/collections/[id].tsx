import React from 'react';
import { DocumentCollectionDetails } from '@/components/rag/DocumentCollectionDetails';
import Header from '@/components/Header';

const DocumentCollectionPage: React.FC = () => {
  return (
    <div className="App relative">
      <Header activePage="rag" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mt-8 mb-4">Document Collection</h1>
        <DocumentCollectionDetails />
      </div>
    </div>
  );
};

export default DocumentCollectionPage;