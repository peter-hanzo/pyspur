import React from 'react'
import { Card, CardBody } from '@nextui-org/react'
import type { VectorIndexResponse } from '@/utils/api'

interface VectorIndexCardProps {
    index: VectorIndexResponse
    onClick: (id: string) => void
}

export default function VectorIndexCard({ index, onClick }: VectorIndexCardProps) {
    return (
        <Card
            isPressable
            onPress={() => onClick(index.id)}
            className="relative w-full"
        >
            <CardBody className="relative min-h-[180px] bg-gradient-to-br from-content1 to-default-100/50 p-6">
                <h2 className="text-xl font-semibold mb-2">{index.name}</h2>
                {index.description && (
                    <p className="text-default-500 text-sm mb-3">{index.description}</p>
                )}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Documents: {index.document_count}</p>
                    </div>
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Chunks: {index.chunk_count}</p>
                    </div>
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Status: {index.status}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
