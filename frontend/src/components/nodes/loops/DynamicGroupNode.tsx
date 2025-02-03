import { RootState } from '@/store/store'
import { Divider } from '@heroui/react'
import {
    Handle,
    NodeResizer,
    Position,
    useConnection,
    useNodeConnections,
    useStore,
    useUpdateNodeInternals,
} from '@xyflow/react'
import isEqual from 'lodash/isEqual'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import BaseNode from '../BaseNode'
import styles from '../DynamicNode.module.css'
import { getRelativeNodesBounds } from './groupNodeUtils'

export interface DynamicGroupNodeProps {
    id: string
}

const DynamicGroupNode: React.FC<DynamicGroupNodeProps> = ({ id }) => {
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Select node data and associated config (if any)
    const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id))
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)

    const updateNodeInternals = useUpdateNodeInternals()

    // Compute minimal dimensions from child nodes, if any.
    const { minWidth, minHeight } = useStore((store) => {
        const childNodes = Array.from(store.nodeLookup.values()).filter((n) => n.parentId === id)
        const rect = getRelativeNodesBounds(childNodes)
        return {
            minWidth: Math.max(200, rect.x + rect.width),
            minHeight: Math.max(100, rect.y + rect.height),
        }
    }, customIsEqual)

    // Determine selection state
    const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode)
    const isSelected = String(id) === String(selectedNodeId)

    // For connection in progress
    const connection = useConnection()

    // Compute predecessor nodes for handles (nodes that connect into this group)
    const [predecessorNodes, setPredecessorNodes] = useState(() => {
        return edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                return sourceNode ? sourceNode : null
            })
            .filter(Boolean)
    })

    const finalPredecessors = useMemo(() => {
        const updatedPredecessors = edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                return sourceNode ? sourceNode : null
            })
            .filter(Boolean)

        let result = updatedPredecessors

        if (connection.inProgress && connection.toNode && connection.toNode.id === id) {
            const fromNodeParentId = connection.fromNode?.parentId
            const toNodeParentId = connection.toNode?.parentId
            const canConnect = fromNodeParentId === toNodeParentId
            if (
                canConnect &&
                connection.fromNode &&
                !updatedPredecessors.find((node: any) => node.id === connection.fromNode.id)
            ) {
                result = [...updatedPredecessors, connection.fromNode]
            }
        }
        return result.filter(
            (node: any, index: number, self: any[]) => self.findIndex((n) => n.id === node.id) === index
        )
    }, [edges, nodes, connection, id])

    useEffect(() => {
        const hasChanged =
            finalPredecessors.length !== predecessorNodes.length ||
            finalPredecessors.some((newNode, i) => !isEqual(newNode, predecessorNodes[i]))
        if (hasChanged) {
            setPredecessorNodes(finalPredecessors)
            updateNodeInternals(id)
        }
    }, [finalPredecessors, predecessorNodes, id, updateNodeInternals])

    // Handlers for Input and Output handle rows
    interface HandleRowProps {
        id: string
        keyName: string
    }

    const InputHandleRow: React.FC<HandleRowProps> = ({ id, keyName }) => {
        const connections = useNodeConnections({ id, handleType: 'target', handleId: keyName })
        const isConnectable = connections.length === 0
        return (
            <div className={`${styles.handleRow} w-full justify-end`} key={keyName}>
                <div className={`${styles.handleCell} ${styles.inputHandleCell}`}>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={keyName}
                        className={`${styles.handle} ${styles.handleLeft}`}
                        isConnectable={isConnectable}
                    />
                </div>
                <div className="border-r border-gray-300 h-full mx-0" />
                <div className="flex flex-grow flex-shrink ml-2 max-w-full overflow-hidden">
                    <span
                        className={`${styles.handleLabel} text-sm font-medium mr-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                    >
                        {keyName}
                    </span>
                </div>
            </div>
        )
    }

    const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
        return (
            <div className={`${styles.handleRow} w-full justify-end`} key={`output-${keyName}`}>
                <div className="flex flex-grow flex-shrink mr-2 max-w-full overflow-hidden">
                    <span
                        className={`${styles.handleLabel} text-sm font-medium ml-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                    >
                        {keyName}
                    </span>
                </div>
                <div className="border-l border-gray-300 h-full mx-0" />
                <div className={`${styles.handleCell} ${styles.outputHandleCell}`}>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={keyName}
                        className={`${styles.handle} ${styles.handleRight}`}
                        isConnectable={true}
                    />
                </div>
            </div>
        )
    }

    const renderHandles = () => {
        const dedupedPredecessors = finalPredecessors.filter(
            (node, index, self) => self.findIndex((n) => n.id === node.id) === index
        )

        return (
            <div className={`${styles.handlesWrapper}`}>
                {/* Input Handles */}
                <div className={`${styles.handlesColumn} ${styles.inputHandlesColumn}`}>
                    {dedupedPredecessors.map((node) => {
                        const handleId = String(node?.data?.title || node.id)
                        return (
                            <InputHandleRow
                                key={`input-handle-${node.id}-${handleId}`}
                                id={node.id}
                                keyName={handleId}
                            />
                        )
                    })}
                </div>

                {/* Output Handle */}
                <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`}>
                    {nodeConfig?.title && <OutputHandleRow id={id} keyName={String(nodeConfig.title)} />}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative">
            <NodeResizer
                nodeId={id}
                isVisible={true}
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
                handleOpenModal={() => {}}
            >
                <div className={`h-full ${styles.nodeWrapper}`}>
                    <div className="mt-2">{renderHandles()}</div>
                    <Divider className="mt-2" />
                    <div style={{ minHeight }} className="mt-2 bg-content2 dark:bg-content2/10 rounded-md h-full">
                        {/* Container that will expand for child nodes */}
                    </div>
                </div>
            </BaseNode>
        </div>
    )
}

function customIsEqual(
    prev: { minWidth: number; minHeight: number },
    next: { minWidth: number; minHeight: number }
): boolean {
    return prev.minWidth === next.minWidth && prev.minHeight === next.minHeight
}

export default memo(DynamicGroupNode)
