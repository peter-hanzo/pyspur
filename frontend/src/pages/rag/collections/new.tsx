import Header from '@/components/Header'
import { DocumentCollectionWizard } from '@/components/rag/DocumentCollectionWizard'

export default function NewDocumentCollectionPage() {
    return (
        <div className="App relative">
            <Header activePage="rag" />

            <DocumentCollectionWizard />
        </div>
    )
}
