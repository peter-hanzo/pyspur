import React from 'react'
import { Card, CardBody } from '@nextui-org/react'
import type { DocumentCollectionResponse } from '@/utils/api'

interface DocumentCollectionCardProps {
    collection: DocumentCollectionResponse
    onClick: (id: string) => void
}

export default function DocumentCollectionCard({ collection, onClick }: DocumentCollectionCardProps) {
    return (
        <Card
            isPressable
            onPress={() => onClick(collection.id)}
            className="relative w-full"
        >
            <CardBody className="relative min-h-[180px] bg-gradient-to-br from-content1 to-default-100/50 p-6">
                <h2 className="text-xl font-semibold mb-2">{collection.name}</h2>
                {collection.description && (
                    <p className="text-default-500 text-sm mb-3">{collection.description}</p>
                )}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Documents: {collection.document_count}</p>
                    </div>
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Chunks: {collection.chunk_count}</p>
                    </div>
                    <div className="flex items-center text-sm">
                        <p className="text-default-500">Status: {collection.status}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
