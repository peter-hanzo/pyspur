import React from 'react'

import Header from '@/components/Header'
import { DocumentCollectionDetails } from '@/components/rag/DocumentCollectionDetails'

const DocumentCollectionPage: React.FC = () => {
    return (
        <div className="App relative">
            <Header activePage="rag" />
            <div className="p-6 pt-4">
                <DocumentCollectionDetails />
            </div>
        </div>
    )
}

export default DocumentCollectionPage
