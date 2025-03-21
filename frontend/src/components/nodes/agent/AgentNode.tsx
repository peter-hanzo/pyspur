import { Button } from '@heroui/react'
import { Icon } from '@iconify/react'
import { NodeResizer, useStore } from '@xyflow/react'
import isEqual from 'lodash/isEqual'
import React, { memo, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import CollapsibleNodePanel from '@/components/nodes/CollapsibleNodePanel'
import { addToolToAgent, setSelectedNode } from '@/store/flowSlice'
import { RootState } from '@/store/store'

import BaseNode from '../BaseNode'
import styles from '../DynamicNode.module.css'
import NodeOutputModal from '../NodeOutputModal'
import { OutputHandleRow } from '../shared/OutputHandleRow'

export interface AgentNodeProps {
    id: string
}

const AgentNode: React.FC<AgentNodeProps> = ({ id }) => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showNodePanel, setShowNodePanel] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const dispatch = useDispatch()

    // Select node data and associated config (if any)
    const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id))
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)
    const nodeConfigs = useSelector((state: RootState) => state.flow.nodeConfigs)

    // Determine selection state
    const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode)
    const isSelected = String(id) === String(selectedNodeId)

    // Get tool nodes (nodes that are children of this agent node)
    const toolNodes = useMemo(() => {
        return nodeConfig?.tools || []
    }, [nodeConfig])

    // Get dynamic dimensions based on node state
    const { minWidth, minHeight } = useStore((store) => {
        // Find all tool nodes of this agent
        const childNodes = Array.from(store.nodeLookup.values()).filter((n: any) => 
            n.parentNode === id || n.data?.agentId === id
        );
        
        // Use minimum dimensions similar to DynamicGroupNode
        return {
            minWidth: 300,
            minHeight: Math.max(150, toolNodes?.length ? 200 : 150),
        };
    }, (prev, next) => prev.minWidth === next.minWidth && prev.minHeight === next.minHeight);

    // Handlers for tool management
    const handleAddTool = () => {
        setShowNodePanel(true)
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

    return (
        <div className="w-full h-full relative">
            <NodeResizer
                nodeId={id}
                isVisible={isSelected}
                minWidth={minWidth}
                minHeight={minHeight}
                lineStyle={{ borderColor: 'rgb(148 163 184)', display: 'none' }}
                handleStyle={{ backgroundColor: 'rgb(148 163 184)', width: '1rem', height: '1rem', borderRadius: 2 }}
            />
            <BaseNode
                id={id}
                data={node?.data}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                positionAbsoluteX={0}
                positionAbsoluteY={0}
                className={`group ${isSelected ? 'selected' : ''}`}
                isResizable={true}
                handleOpenModal={() => setIsModalOpen(true)}
                renderOutputHandles={renderOutputHandles}
            >
                <div className={`h-full ${styles.nodeWrapper}`}>
                    {/* Tool Management Section */}
                    <div className="mt-4 flex flex-col h-full">
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
                    <CollapsibleNodePanel
                        handleAddNode={handleAddNodeToAgent}
                        isCustomAdd={true}
                        controlledExpanded={showNodePanel}
                        onExpandedChange={(expanded) => {
                            setShowNodePanel(expanded)
                        }}
                    />
                </div>
            )}
            <NodeOutputModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                title={node?.data?.title || 'Agent Output'}
                data={node?.data}
            />
        </div>
    )
}

export default memo(AgentNode)
