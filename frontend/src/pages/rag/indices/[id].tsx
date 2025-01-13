import React from 'react';
import { VectorIndexDetails } from '@/components/rag/VectorIndexDetails';

export default function VectorIndexPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Vector Index</h1>
      <VectorIndexDetails />
    </div>
  );
}