import TraceTable from '@/components/TraceTable'
import { getWorkflow } from '@/utils/api'
import { Spinner } from '@heroui/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

const RunsPage: React.FC = () => {
    const router = useRouter()
    const { id } = router.query
    const [workflowName, setWorkflowName] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchWorkflowName = async () => {
            if (typeof id !== 'string') return
            try {
                const workflow = await getWorkflow(id)
                setWorkflowName(workflow.name)
            } catch (error) {
                console.error('Error fetching workflow:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchWorkflowName()
        }
    }, [id])

    if (!id || typeof id !== 'string') {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-default-500">Invalid workflow ID</div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>{workflowName ? `${workflowName} - Runs` : 'Spur Runs'}</title>
            </Head>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-default-900">{workflowName}</h1>
                    <p className="text-default-500">Run History</p>
                </div>
                <TraceTable workflowId={id} />
            </div>
        </>
    )
}

export default RunsPage
