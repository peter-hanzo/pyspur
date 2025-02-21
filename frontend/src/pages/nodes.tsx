import { Alert } from '@heroui/react'
import React from 'react'
import Header from '../components/Header'
import OpenAPIParser from '../components/OpenAPIParser'
import { createNodesFromOpenAPI } from '../utils/api'

const NodesPage: React.FC = () => {
    const [alert, setAlert] = React.useState<{
        message: string
        type: 'success' | 'error'
        isVisible: boolean
    }>({
        message: '',
        type: 'success',
        isVisible: false,
    })

    const handleEndpointsSelected = async (endpoints: any[], fullSpec: any) => {
        try {
            await createNodesFromOpenAPI(endpoints, fullSpec)
            setAlert({
                message: 'Nodes created successfully!',
                type: 'success',
                isVisible: true,
            })
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, isVisible: false }))
            }, 3000)
        } catch (error) {
            setAlert({
                message: 'Failed to create nodes. Please try again.',
                type: 'error',
                isVisible: true,
            })
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, isVisible: false }))
            }, 3000)
        }
    }

    return (
        <div className="App relative">
            <Header activePage="nodes" />
            <div className="flex flex-col gap-2 max-w-7xl w-full mx-auto pt-2 px-6">
                {alert.isVisible && (
                    <div className="fixed bottom-4 right-4 z-50">
                        <Alert color={alert.type === 'success' ? 'success' : 'danger'}>{alert.message}</Alert>
                    </div>
                )}
                <header className="mb-6">
                    <div className="flex w-full items-center">
                        <div className="flex flex-col max-w-fit">
                            <h1 className="text-lg font-bold text-default-900 lg:text-2xl">Nodes</h1>
                            <p className="text-small text-default-400 lg:text-medium">
                                Create nodes from OpenAPI specifications
                            </p>
                        </div>
                    </div>
                </header>
                <OpenAPIParser onEndpointsSelected={handleEndpointsSelected} />
            </div>
        </div>
    )
}

export default NodesPage
