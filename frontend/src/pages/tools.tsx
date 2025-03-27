import { Alert, Tab, Tabs } from '@heroui/react'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Header from '../components/Header'
import SpecTools from '../components/SpecTools'
import StockTools from '../components/StockTools'
import { fetchNodeTypes } from '../store/nodeTypesSlice'
import { RootState } from '../store/store'
import { createOpenAPISpec } from '../utils/api'

const ToolsPage: React.FC = () => {
    const dispatch = useDispatch()
    const nodeTypesStatus = useSelector((state: RootState) => state.nodeTypes.status)
    const [alert, setAlert] = React.useState<{
        message: string
        type: 'success' | 'error'
        isVisible: boolean
    }>({
        message: '',
        type: 'success',
        isVisible: false,
    })
    const [selectedTab, setSelectedTab] = React.useState('stock')

    // Fetch node types if not already loaded
    useEffect(() => {
        if (nodeTypesStatus === 'idle') {
            dispatch(fetchNodeTypes() as any)
        }
    }, [dispatch, nodeTypesStatus])

    const handleEndpointsSelected = async (fullSpec: any) => {
        try {
            await createOpenAPISpec(fullSpec)
            setAlert({
                message: 'OpenAPI spec created successfully!',
                type: 'success',
                isVisible: true,
            })
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, isVisible: false }))
            }, 3000)
        } catch (error) {
            setAlert({
                message: 'Failed to create OpenAPI spec. Please try again.',
                type: 'error',
                isVisible: true,
            })
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, isVisible: false }))
            }, 3000)
        }
    }

    const handleTabChange = (key: React.Key) => {
        setSelectedTab(key.toString())
    }

    return (
        <div className="App relative">
            <Header activePage="tools" />
            <div className="flex flex-col gap-2 max-w-7xl w-full mx-auto pt-2 px-6">
                {alert.isVisible && (
                    <div className="fixed bottom-4 right-4 z-50">
                        <Alert color={alert.type === 'success' ? 'success' : 'danger'}>{alert.message}</Alert>
                    </div>
                )}
                <header className="mb-6">
                    <div className="flex w-full items-center">
                        <div className="flex flex-col max-w-fit">
                            <h1 className="text-lg font-bold text-default-900 lg:text-2xl">Tools</h1>
                            <p className="text-small text-default-400 lg:text-medium">
                                Create and manage tools for your workflows
                            </p>
                        </div>
                    </div>
                </header>

                <Tabs aria-label="Tools Management" selectedKey={selectedTab} onSelectionChange={handleTabChange}>
                    <Tab key="stock" title="Stock Tools">
                        <div className="py-4">
                            <StockTools />
                        </div>
                    </Tab>
                    <Tab key="openapi" title="OpenAPI Tools">
                        <div className="py-4">
                            <SpecTools />
                        </div>
                    </Tab>
                    {/* <Tab key="mcp" title="MCP Tools">
                        <div className="py-4">
                            <MCPTools />
                        </div>
                    </Tab> */}
                </Tabs>
            </div>
        </div>
    )
}

export default ToolsPage
