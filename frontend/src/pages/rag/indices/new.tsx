import React from 'react';
import { VectorIndexWizard } from '@/components/rag/VectorIndexWizard';

export default function NewVectorIndexPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create Vector Index</h1>
      <VectorIndexWizard />
    </div>
  );
}