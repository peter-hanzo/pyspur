import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Tab,
    Tabs,
} from '@heroui/react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { RootState } from '../store/store'
import { FlowWorkflowNodeType } from '../store/nodeTypesSlice'
import CodeEditor from './CodeEditor'
import NodeToolsSelector from './NodeToolsSelector'

interface OpenAPIEndpoint {
    path: string
    method: string
    summary?: string
    operationId?: string
}

interface OpenAPIParserProps {
    onEndpointsSelected: (endpoints: OpenAPIEndpoint[], fullSpec: any) => void
}

const OpenAPIParser: React.FC<OpenAPIParserProps> = ({ onEndpointsSelected }) => {
    const [jsonInput, setJsonInput] = useState('')
    const [endpoints, setEndpoints] = useState<OpenAPIEndpoint[]>([])
    const [error, setError] = useState<string | null>(null)
    const [parsedSpec, setParsedSpec] = useState<any>(null)
    const [selectedTab, setSelectedTab] = useState('openapi')
    const [selectedNodes, setSelectedNodes] = useState<FlowWorkflowNodeType[]>([])
    
    // Get node types from Redux store
    const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data)

    // Parse OpenAPI spec
    const parseOpenAPI = () => {
        try {
            const spec = JSON.parse(jsonInput)
            const parsedEndpoints: OpenAPIEndpoint[] = []

            // Parse paths and methods from OpenAPI spec
            Object.entries(spec.paths || {}).forEach(([path, pathObj]: [string, any]) => {
                Object.entries(pathObj).forEach(([method, methodObj]: [string, any]) => {
                    parsedEndpoints.push({
                        path,
                        method: method.toUpperCase(),
                        summary: methodObj.summary,
                        operationId: methodObj.operationId,
                    })
                })
            })

            setEndpoints(parsedEndpoints)
            setParsedSpec(spec)
            setError(null)
        } catch (err) {
            setError('Invalid OpenAPI specification. Please check your JSON.')
            setEndpoints([])
            setParsedSpec(null)
        }
    }

    // Handle creation of nodes or tools
    const handleCreateNodes = () => {
        if (selectedTab === 'openapi' && parsedSpec) {
            onEndpointsSelected(endpoints, parsedSpec)
        } else if (selectedTab === 'nodes' && selectedNodes.length > 0) {
            // Convert selected nodes to endpoints format for API
            const nodeEndpoints = selectedNodes.map(node => ({
                path: `/nodes/${node.name}`,
                method: 'POST',
                summary: node.config.title || node.name,
                operationId: node.name,
                nodeType: node.name,
                // Include any additional metadata needed
                metadata: {
                    nodeType: node.name,
                    input_schema: node.config.input_schema,
                    output_schema: node.config.output_schema
                }
            }));
            
            onEndpointsSelected(nodeEndpoints, { 
                info: { title: "Node Tools", version: "1.0.0" },
                nodes: selectedNodes 
            });
        }
    }

    // Handle tab change
    const handleTabChange = (key: React.Key) => {
        setSelectedTab(key.toString())
    }

    return (
        <Card className="w-full mb-10">
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold">Create Tools</h3>
                    <p className="text-default-500">
                        Create tools from OpenAPI specifications or existing nodes
                    </p>
                </div>
            </CardHeader>
            <CardBody>
                <Tabs 
                    selectedKey={selectedTab} 
                    onSelectionChange={handleTabChange}
                    aria-label="Tool Creation Options"
                >
                    <Tab key="openapi" title="OpenAPI Specification">
                        <div className="flex flex-col gap-4 mt-4">
                            <div className="w-full max-w-[800px]">
                                <CodeEditor 
                                    code={jsonInput} 
                                    onChange={setJsonInput} 
                                    mode="json" 
                                    label="OpenAPI Specification" 
                                />
                            </div>
                            <Button 
                                color="primary" 
                                onPress={parseOpenAPI} 
                                className="w-fit" 
                                isDisabled={!jsonInput.trim()}
                            >
                                Parse Specification
                            </Button>
                            {error && <div className="text-danger text-sm mt-1">{error}</div>}
                            
                            {endpoints.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-lg font-medium mb-2">Available Endpoints ({endpoints.length})</h4>
                                    <div className="overflow-auto max-h-60 border border-default-200 rounded-lg p-4">
                                        {endpoints.map((endpoint, index) => (
                                            <div key={index} className="mb-2 pb-2 border-b border-default-100 last:border-0">
                                                <div className="flex gap-2">
                                                    <span className="px-2 py-1 bg-primary-100 text-primary rounded text-xs font-bold">
                                                        {endpoint.method}
                                                    </span>
                                                    <span className="font-mono text-sm">{endpoint.path}</span>
                                                </div>
                                                {endpoint.summary && (
                                                    <div className="text-sm text-default-500 mt-1 ml-10">
                                                        {endpoint.summary}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tab>
                    <Tab key="nodes" title="Node Types">
                        <div className="mt-4">
                            <h4 className="text-lg font-medium mb-2">Select Nodes to Use as Tools</h4>
                            <NodeToolsSelector 
                                nodeTypes={nodeTypes}
                                onSelectionChange={setSelectedNodes}
                            />
                        </div>
                    </Tab>
                </Tabs>
                
                <Divider className="my-4" />
                
                <div className="flex justify-end mt-4">
                    <Button
                        color="primary"
                        onClick={handleCreateNodes}
                        isDisabled={(selectedTab === 'openapi' && endpoints.length === 0) || 
                                   (selectedTab === 'nodes' && selectedNodes.length === 0)}
                    >
                        Create Tools
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

export default OpenAPIParser
