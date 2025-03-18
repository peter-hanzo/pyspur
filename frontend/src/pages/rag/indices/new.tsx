import Header from '@/components/Header'
import { VectorIndexWizard } from '@/components/rag/VectorIndexWizard'

export default function NewVectorIndexPage() {
    return (
        <div className="App relative">
            <Header activePage="rag" />
            <VectorIndexWizard />
        </div>
    )
}
