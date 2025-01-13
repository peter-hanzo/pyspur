import React from 'react';
import { DocumentCollectionWizard } from '@/components/rag/DocumentCollectionWizard';

export default function NewDocumentCollectionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create Document Collection</h1>
      <DocumentCollectionWizard />
    </div>
  );
}