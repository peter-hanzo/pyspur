import { addToolToAgent, setSelectedNode, updateNodeConfigOnly } from '@/store/flowSlice'
import { RootState } from '@/store/store'
import { Button, Card } from '@heroui/react'
import { Icon } from '@iconify/react'
import isEqual from 'lodash/isEqual'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import BaseNode from '../BaseNode'
import CollapsibleNodePanel from '../CollapsibleNodePanel'
import styles from '../DynamicNode.module.css'
import { OutputHandleRow } from '../shared/OutputHandleRow'

export interface AgentNodeProps {
    id: string
}

const baseNodeStyle = {
    width: 'auto',
    minWidth: '300px',
    maxWidth: '600px',
    height: 'auto',
    minHeight: '150px',
    maxHeight: '800px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
}

const AgentNode: React.FC<AgentNodeProps> = ({ id }) => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showNodePanel, setShowNodePanel] = useState(false)
    const dispatch = useDispatch()

    // Select node data and associated config (if any)
    const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id))
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)
    const nodeConfigs = useSelector((state: RootState) => state.flow.nodeConfigs)

    // Get tool nodes (nodes that are children of this agent node)
    const toolNodes = useMemo(() => {
        return nodes.filter((n) => n.parentId === id)
    }, [nodes, id])

    // Handlers for tool management
    const handleAddTool = () => {
        setShowNodePanel(true)
        // dispatch(setNodePanelExpanded(true))
    }

    const handleToolClick = (toolId: string) => {
        dispatch(setSelectedNode({ nodeId: toolId }))
    }

    // Custom handler for adding a tool to the agent
    const handleAddNodeToAgent = (nodeName: string) => {
        dispatch(
            addToolToAgent({
                nodeId: id,
                nodeTypeName: nodeName,
            })
        )
        setShowNodePanel(false)
    }

    // Render output handles
    const renderOutputHandles = () => {
        return (
            <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`} id="output-handle">
                {nodeConfig?.title && (
                    <OutputHandleRow id={id} keyName={String(nodeConfig?.title)} isCollapsed={isCollapsed} />
                )}
            </div>
        )
    }

    // Prevent tool nodes from being connected
    useEffect(() => {
        const toolNodeIds = new Set(toolNodes.map((n) => n.id))

        // Update each tool node's config to prevent connections
        toolNodes.forEach((toolNode) => {
            if (toolNode.data?.isConnectable !== false) {
                dispatch(
                    updateNodeConfigOnly({
                        id: toolNode.id,
                        data: {
                            ...toolNode.data,
                            isConnectable: false,
                        },
                    })
                )
            }
        })
    }, [toolNodes, dispatch])

    return (
        <div className="w-full h-full relative">
            <BaseNode
                id={id}
                data={node?.data}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                positionAbsoluteX={0}
                positionAbsoluteY={0}
                className={`group`}
                isResizable={true}
                handleOpenModal={() => {}}
                renderOutputHandles={renderOutputHandles}
                style={baseNodeStyle}
            >
                <div className={`h-full ${styles.nodeWrapper}`}>
                    {/* Tool Management Section */}
                    <div className="mt-4 flex flex-col h-full">
                        <div>
                            <h3 className="text-sm font-medium mb-4">Tools</h3>
                        </div>

                        {/* Tool Cards */}
                        <div className="space-y-2 flex-grow overflow-y-auto">
                            {toolNodes.map((toolNode) => (
                                <Card
                                    key={toolNode.id}
                                    className="p-2 cursor-pointer hover:bg-default-100"
                                    onClick={() => handleToolClick(toolNode.id)}
                                >
                                    <div className="flex items-center">
                                        {toolNode.data?.logo ? (
                                            <img src={toolNode.data.logo} alt="Tool Logo" className="w-6 h-6 mr-2" />
                                        ) : (
                                            <div
                                                className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs text-white"
                                                style={{ backgroundColor: toolNode.data?.color || '#ccc' }}
                                            >
                                                {toolNode.data?.acronym || 'T'}
                                            </div>
                                        )}
                                        <span className="text-sm">{toolNode.data?.title || toolNode.id}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Add Tool Button */}
                        <Button
                            size="lg"
                            variant="flat"
                            onPress={handleAddTool}
                            className="w-full mt-4 dark:bg-default-100/20 dark:border-default-700"
                        >
                            <Icon
                                icon="solar:add-circle-linear"
                                width={20}
                                className="text-default-600 dark:text-default-400"
                            />
                            <span className="ml-2">Add Tool</span>
                        </Button>
                    </div>
                </div>
            </BaseNode>

            {/* Node Panel for Adding Tools */}
            {showNodePanel && (
                <div className="absolute bottom-full left-0 mb-2">
                    <CollapsibleNodePanel handleAddNode={handleAddNodeToAgent} isCustomAdd={true} />
                </div>
            )}
        </div>
    )
}

export default memo(AgentNode)
