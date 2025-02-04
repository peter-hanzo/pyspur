import React, { useEffect, useRef, useState, useMemo, memo } from 'react'
import {
    Handle,
    useNodeConnections,
    NodeProps,
    useConnection,
    Position,
    useUpdateNodeInternals,
    NodeResizer,
} from '@xyflow/react'
import { useSelector } from 'react-redux'
import BaseNode from './BaseNode'
import styles from './DynamicNode.module.css'
import { CardBody, Input } from '@heroui/react'
import { FlowWorkflowNode } from '@/types/api_types/nodeTypeSchemas'
import { selectPropertyMetadata } from '../../store/nodeTypesSlice'
import { RootState } from '../../store/store'
import NodeOutputDisplay from './NodeOutputDisplay'
import NodeOutputModal from './NodeOutputModal'
import isEqual from 'lodash/isEqual'
import NodeErrorDisplay from './NodeErrorDisplay'
import { isTargetAncestorOfSource } from '@/utils/cyclicEdgeUtils'

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

const nodeResizerHandleStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '4px',
}
interface SchemaMetadata {
    required?: boolean
    title?: string
    type?: string
    [key: string]: any
}
export interface DynamicNodeProps extends NodeProps<FlowWorkflowNode> {
    displayOutput?: boolean
    readOnly?: boolean
    displaySubflow?: boolean
    displayResizer?: boolean
}

const DynamicNode: React.FC<DynamicNodeProps> = ({
    id,
    data,
    dragHandle,
    type,
    selected,
    isConnectable,
    zIndex,
    positionAbsoluteX,
    positionAbsoluteY,
    displayOutput,
    ...props
}) => {
    const nodeRef = useRef<HTMLDivElement | null>(null)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    const nodes = useSelector(
        (state: RootState) =>
            state.flow.nodes.map((node) => ({
                id: node.id,
                type: node.type,
                data: {
                    title: node.data?.title,
                },
            })),
        isEqual
    )
    const nodeData = data
    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)

    const inputMetadata = useSelector((state: RootState) => selectPropertyMetadata(state, `${type}.input`), isEqual)
    const outputMetadata = useSelector((state: RootState) => selectPropertyMetadata(state, `${type}.output`), isEqual)

    const excludeSchemaKeywords = (metadata: SchemaMetadata): Record<string, any> => {
        const schemaKeywords = ['required', 'title', 'type']
        return Object.keys(metadata).reduce((acc: Record<string, any>, key) => {
            if (!schemaKeywords.includes(key)) {
                acc[key] = metadata[key]
            }
            return acc
        }, {})
    }

    const cleanedInputMetadata = excludeSchemaKeywords(inputMetadata || {})
    const cleanedOutputMetadata = excludeSchemaKeywords(outputMetadata || {})
    const updateNodeInternals = useUpdateNodeInternals()

    const [predecessorNodes, setPredecessorNodes] = useState(() => {
        return edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) return null
                if (sourceNode.type === 'RouterNode' && edge.sourceHandle) {
                    // console.log('RouterNode', edge.targetHandle)
                    return {
                        ...sourceNode,
                        handle_id: edge.targetHandle
                    }
                }
                return sourceNode
            })
            .filter(Boolean)
    })
    interface HandleRowProps {
        id: string
        keyName: string
    }

    const InputHandleRow: React.FC<HandleRowProps> = ({ id, keyName }) => {
        const connections = useNodeConnections({ id: id, handleType: 'target', handleId: keyName })
        const isConnectable = !isCollapsed && (connections.length === 0 || String(keyName).startsWith('branch'))
        console.log(id, keyName)
        return (
            <div className={`${styles.handleRow} w-full justify-end`} key={keyName} id={`input-${keyName}-row`}>
                <div className={`${styles.handleCell} ${styles.inputHandleCell}`} id={`input-${keyName}-handle`}>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={String(id)}
                        className={`${styles.handle} ${styles.handleLeft} ${isCollapsed ? styles.collapsedHandleInput : ''}`}
                        isConnectable={isConnectable}
                    />
                </div>
                <div className="border-r border-gray-200 h-full mx-0" />
                {!isCollapsed && (
                    <div
                        className="align-center flex flex-grow flex-shrink ml-[0.5rem] max-w-full overflow-hidden"
                        id={`input-${keyName}-label`}
                    >
                        {editingField === keyName ? (
                            <Input
                                key={`input-field-${keyName}`}
                                autoFocus
                                defaultValue={String(keyName)}
                                size="sm"
                                variant="faded"
                                radius="lg"
                                classNames={{
                                    input: 'bg-default-100/50 backdrop-blur-sm',
                                    inputWrapper: 'shadow-none',
                                }}
                            />
                        ) : (
                            <span
                                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary
                                    mr-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                            >
                                {String(keyName)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
        return (
            <div
                className={`${styles.handleRow} w-full justify-end`}
                key={`output-${keyName}`}
                id={`output-${keyName}-row`}
            >
                {!isCollapsed && (
                    <div
                        className="align-center flex flex-grow flex-shrink mr-[0.5rem] max-w-full overflow-hidden"
                        id={`output-${keyName}-label`}
                    >
                        {editingField === keyName ? (
                            <Input
                                key={`output-field-${keyName}`}
                                autoFocus
                                defaultValue={keyName}
                                size="sm"
                                variant="faded"
                                radius="lg"
                                classNames={{
                                    input: 'bg-default-100/50 backdrop-blur-sm',
                                    inputWrapper: 'shadow-none',
                                }}
                            />
                        ) : (
                            <span
                                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary
                                    ml-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                            >
                                {keyName}
                            </span>
                        )}
                    </div>
                )}
                <div className="border-l border-gray-200 h-full mx-0" />
                <div className={`${styles.handleCell} ${styles.outputHandleCell}`} id={`output-${keyName}-handle`}>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={String(id)}
                        className={`${styles.handle} ${styles.handleRight} ${isCollapsed ? styles.collapsedHandleOutput : ''}`}
                        isConnectable={!isCollapsed}
                    />
                </div>
            </div>
        )
    }

    const connection = useConnection()

    // Compute finalPredecessors using useMemo to avoid unnecessary computations:
    const finalPredecessors = useMemo(() => {
        const updatedPredecessorNodes = edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) return null
                if (sourceNode.type === 'RouterNode' && edge.sourceHandle) {
                    // console.log('RouterNode', edge.targetHandle)
                    return {
                        ...sourceNode,
                        handle_id: edge.sourceHandle,
                    }
                }
                return sourceNode
            })
            .filter(Boolean)

        let result = updatedPredecessorNodes

        if (connection.inProgress && connection.toNode && connection.toNode.id === id) {
            // Check if nodes have the same parent or both have no parent
            const fromNodeParentId = connection.fromNode?.parentId
            const toNodeParentId = connection.toNode?.parentId
            const canConnect =
                fromNodeParentId === toNodeParentId &&
                !isTargetAncestorOfSource(connection.fromNode.id, connection.toNode.id, nodes, edges)

            if (
                canConnect &&
                connection.fromNode &&
                !updatedPredecessorNodes.find((node: any) => node.id === connection.fromNode.id)
            ) {
                if (connection.fromNode.type === 'RouterNode' && connection.fromHandle) {
                    // console.log('RouterNode', connection.fromHandle.id)
                    result = [
                        ...updatedPredecessorNodes,
                        {
                            id: connection.fromNode.id,
                            type: connection.fromNode.type,
                            data: {
                                title: connection.fromHandle.id,
                            },
                        },
                    ]
                } else {
                    result = [
                        ...updatedPredecessorNodes,
                        {
                            id: connection.fromNode.id,
                            type: connection.fromNode.type,
                            data: {
                                title:
                                    (connection.fromNode.data as { title?: string })?.title || connection.fromNode.id,
                            },
                        },
                    ]
                }
            }
        }
        // deduplicate
        result = result.filter((node, index, self) => self.findIndex((n) => n.id === node.id) === index)
        return result
    }, [edges, nodes, connection, id])

    useEffect(() => {
        // Check if finalPredecessors differ from predecessorNodes
        // (We do a deeper comparison to detect config/title changes, not just ID changes)
        const hasChanged =
            finalPredecessors.length !== predecessorNodes.length ||
            finalPredecessors.some((newNode, i) => !isEqual(newNode, predecessorNodes[i]))

        if (hasChanged) {
            setPredecessorNodes(finalPredecessors)
            updateNodeInternals(id)
        }
    }, [finalPredecessors, predecessorNodes, updateNodeInternals, id])

    const isRouterNode = type === 'RouterNode'

    const renderHandles = () => {
        if (!nodeData) return null
        const dedupedPredecessors = finalPredecessors.filter(
            (node, index, self) => self.findIndex((n) => n.id === node.id) === index
        )

        return (
            <div className={`${styles.handlesWrapper}`} id="handles">
                {/* Input Handles */}
                <div className={`${styles.handlesColumn} ${styles.inputHandlesColumn}`} id="input-handles">
                    {dedupedPredecessors.map((node) => {
                        const handleId =
                            node.type === 'RouterNode' && node.handle_id
                                ? (node.data?.title + '.' + node.handle_id)
                                : String(node.data?.title || node.id || '')
                        // set node id for router node as node.id + node.data.title
                        const nodeId = node.type === 'RouterNode' ? node?.id + '.' + node?.handle_id : node?.id
                        // console.log(nodeId)
                        return (
                            <InputHandleRow
                                key={`input-handle-row-${node.id}-${handleId}`}
                                id={nodeId}
                                keyName={handleId}
                            />
                        )
                    })}
                </div>

                <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`} id="output-handle">
                    {nodeData?.title && <OutputHandleRow id={id} keyName={String(nodeData?.title)} />}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className={styles.dynamicNodeWrapper} style={{ zIndex: props.parentId ? 1 : 0 }}>
                <BaseNode
                    id={id}
                    data={nodeData}
                    style={baseNodeStyle}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    handleOpenModal={setIsModalOpen}
                    className="hover:!bg-background"
                    positionAbsoluteX={positionAbsoluteX}
                    positionAbsoluteY={positionAbsoluteY}
                    {...props}
                >
                    <div className={styles.nodeWrapper} ref={nodeRef} id={`node-${id}-wrapper`}>
                        {isRouterNode && (
                            <div>
                                <strong>Conditional Node</strong>
                            </div>
                        )}
                        {renderHandles()}
                    </div>
                    {nodeData.error && <NodeErrorDisplay error={nodeData.error} />}
                    {displayOutput && <NodeOutputDisplay key={`output-display-${id}`} output={nodeData.run} />}
                </BaseNode>
            </div>
            <NodeOutputModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                title={nodeData?.title || 'Node Output'}
                data={nodeData}
            />
        </>
    )
}

export default DynamicNode
