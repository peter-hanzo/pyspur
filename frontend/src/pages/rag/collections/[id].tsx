import React from 'react';
import { DocumentCollectionDetails } from '@/components/rag/DocumentCollectionDetails';

export default function DocumentCollectionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Document Collection</h1>
      <DocumentCollectionDetails />
    </div>
  );
}