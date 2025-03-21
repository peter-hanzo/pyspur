import { Alert, Button, Tab, Tabs } from '@heroui/react'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Header from '../components/Header'
import OpenAPIParser from '../components/OpenAPIParser'
import { fetchNodeTypes } from '../store/nodeTypesSlice'
import { RootState } from '../store/store'
import { createToolsFromOpenAPI } from '../utils/api'

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
    const [selectedTab, setSelectedTab] = React.useState('create')

    // Fetch node types if not already loaded
    useEffect(() => {
        if (nodeTypesStatus === 'idle') {
            dispatch(fetchNodeTypes())
        }
    }, [dispatch, nodeTypesStatus])

    const handleEndpointsSelected = async (endpoints: any[], fullSpec: any) => {
        try {
            await createToolsFromOpenAPI(endpoints, fullSpec)
            setAlert({
                message: 'Tools created successfully!',
                type: 'success',
                isVisible: true,
            })
            setTimeout(() => {
                setAlert((prev) => ({ ...prev, isVisible: false }))
            }, 3000)
        } catch (error) {
            setAlert({
                message: 'Failed to create tools. Please try again.',
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
                
                <Tabs 
                    aria-label="Tools Management" 
                    selectedKey={selectedTab}
                    onSelectionChange={handleTabChange}
                >
                    <Tab key="create" title="Create Tools">
                        <div className="py-4">
                            <OpenAPIParser onEndpointsSelected={handleEndpointsSelected} />
                        </div>
                    </Tab>
                    <Tab key="manage" title="Manage Tools">
                        <div className="py-4">
                            <div className="bg-default-50 rounded-lg p-6 text-center">
                                <h3 className="text-xl font-semibold mb-2">Tool Management</h3>
                                <p className="text-default-500 mb-4">
                                    This feature is coming soon. You'll be able to view, edit, and delete your tools here.
                                </p>
                                <Button color="primary" variant="flat" disabled>
                                    View All Tools
                                </Button>
                            </div>
                        </div>
                    </Tab>
                </Tabs>
            </div>
        </div>
    )
}

export default ToolsPage
