import React from 'react'

import Header from '@/components/Header'
import { VectorIndexDetails } from '@/components/rag/VectorIndexDetails'

const VectorIndexPage: React.FC = () => {
    return (
        <div className="App relative">
            <Header activePage="rag" />
            <div className="p-6 pt-4">
                <VectorIndexDetails />
            </div>
        </div>
    )
}

export default VectorIndexPage
