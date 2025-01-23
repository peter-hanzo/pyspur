import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
    NodeProps,
    NodeToolbar,
    useReactFlow,
    useStore,
    useStoreApi,
    NodeResizer,
    Handle,
    Position,
    useNodeConnections,
    useConnection,
    useUpdateNodeInternals,
} from '@xyflow/react'
import { Card, CardHeader, CardBody, Button, Input, Alert, Divider } from '@heroui/react'
import isEqual from 'lodash/isEqual'
import { Icon } from '@iconify/react'
import { convertToPythonVariableName } from '@/utils/variableNameUtils'
import useDetachNodes from './useDetachNodes'
import { getRelativeNodesBounds } from './groupNodeUtils'
import { RootState } from '@/store/store'
import { getNodeTitle } from '@/utils/flowUtils'
import { updateNodeTitle } from '@/store/flowSlice'
import styles from '../DynamicNode.module.css'
import { TaskStatus } from '@/types/api_types/taskSchemas'

const staticStyles = {
    targetHandle: {
        top: '50%',
        left: 0,
        width: '30%',
        height: '100%',
        zIndex: 10,
        opacity: 0,
        pointerEvents: 'auto' as const,
    },
    controlsCard: {
        position: 'absolute' as const,
        top: '-50px',
        right: '0px',
        padding: '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'auto' as const,
    },
    baseTag: {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        display: 'inline-block',
        color: '#fff',
    },
    collapseButton: {
        minWidth: 'auto',
        height: '24px',
        padding: '0 8px',
        fontSize: '0.8rem',
        marginRight: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlsContainer: {
        position: 'absolute' as const,
        top: '8px',
        right: '8px',
        display: 'flex',
        alignItems: 'center',
    },
}
const resizerLineStyle: React.CSSProperties = { borderColor: 'rgb(148 163 184)', display: 'none' } // Tailwind slate-400
const resizerHandleStyle: React.CSSProperties = {
    backgroundColor: 'rgb(148 163 184)',
    width: '1rem',
    height: '1rem',
    borderRadius: 2,
}

export interface DynamicGroupNodeProps {
    id: string
}

const DynamicGroupNode: React.FC<DynamicGroupNodeProps> = ({ id }) => {
    const dispatch = useDispatch()
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInputValue, setTitleInputValue] = useState('')
    const [showTitleError, setShowTitleError] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)

    const store = useStoreApi()
    const { deleteElements } = useReactFlow()
    const detachNodes = useDetachNodes()

    const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id))
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])

    const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
        const childNodes = Array.from(store.nodeLookup.values()).filter((n) => n.parentId === id)
        const rect = getRelativeNodesBounds(childNodes)

        return {
            minWidth: rect.x + rect.width,
            minHeight: rect.y + rect.height,
            hasChildNodes: childNodes.length > 0,
        }
    }, customIsEqual)

    // Add selected node selector
    const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode)
    const isSelected = String(id) === String(selectedNodeId)

    const nodeRef = useRef<HTMLDivElement | null>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)

    const acronym = node?.data?.acronym || 'N/A'
    const color = node?.data?.color || '#ccc'
    const tagStyle = useMemo(
        () => ({
            ...staticStyles.baseTag,
            backgroundColor: color,
        }),
        [color]
    )

    // Handle predecessor nodes logic
    const [predecessorNodes, setPredecessorNodes] = useState(() => {
        return edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) return null
                return sourceNode
            })
            .filter(Boolean)
    })

    const connection = useConnection()

    // Compute finalPredecessors using useMemo
    const finalPredecessors = useMemo(() => {
        const updatedPredecessorNodes = edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) return null
                return sourceNode
            })
            .filter(Boolean)

        let result = updatedPredecessorNodes

        if (connection.inProgress && connection.toNode && connection.toNode.id === id) {
            // Check if nodes have the same parent or both have no parent
            const fromNodeParentId = connection.fromNode?.parentId
            const toNodeParentId = connection.toNode?.parentId
            const canConnect = fromNodeParentId === toNodeParentId

            if (
                canConnect &&
                connection.fromNode &&
                !updatedPredecessorNodes.find((node: any) => node.id === connection.fromNode.id)
            ) {
                result = [
                    ...updatedPredecessorNodes,
                    {
                        id: connection.fromNode.id,
                        type: connection.fromNode.type,
                        data: {
                            title: (connection.fromNode.data as { title?: string })?.title || connection.fromNode.id,
                        },
                    },
                ]
            }
        }
        return result.filter((node, index, self) => self.findIndex((n) => n.id === node.id) === index)
    }, [edges, nodes, connection, id])

    useEffect(() => {
        const hasChanged =
            finalPredecessors.length !== predecessorNodes.length ||
            finalPredecessors.some((newNode, i) => !isEqual(newNode, predecessorNodes[i]))

        if (hasChanged) {
            setPredecessorNodes(finalPredecessors)
            updateNodeInternals(id)
        }
    }, [finalPredecessors, predecessorNodes, updateNodeInternals, id])

    // Handle components
    interface HandleRowProps {
        id: string
        keyName: string
    }

    const InputHandleRow: React.FC<HandleRowProps> = ({ id, keyName }) => {
        const connections = useNodeConnections({ id: id, handleType: 'target', handleId: keyName })
        const isConnectable = connections.length === 0

        return (
            <div className={`${styles.handleRow} w-full justify-end`} key={keyName}>
                <div className={`${styles.handleCell} ${styles.inputHandleCell}`}>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={String(keyName)}
                        className={`${styles.handle} ${styles.handleLeft}`}
                        isConnectable={isConnectable}
                    />
                </div>
                <div className="border-r border-gray-300 h-full mx-0" />
                <div className="align-center flex flex-grow flex-shrink ml-[0.5rem] max-w-full overflow-hidden">
                    <span
                        className={`${styles.handleLabel} text-sm font-medium mr-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                    >
                        {String(keyName)}
                    </span>
                </div>
            </div>
        )
    }

    const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
        return (
            <div className={`${styles.handleRow} w-full justify-end`} key={`output-${keyName}`}>
                <div className="align-center flex flex-grow flex-shrink mr-[0.5rem] max-w-full overflow-hidden">
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
                        const handleId = String(node.data?.title || node.id || '')
                        return (
                            <InputHandleRow
                                key={`input-handle-row-${node.id}-${handleId}`}
                                id={node?.id}
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

    const onDelete = () => {
        deleteElements({ nodes: [{ id }] })
    }

    const onDetach = () => {
        const childNodeIds = Array.from(store.getState().nodeLookup.values())
            .filter((n) => n.parentId === id)
            .map((n) => n.id)

        detachNodes(childNodeIds, id)
    }

    const handleTitleChange = (newTitle: string) => {
        const validTitle = convertToPythonVariableName(newTitle)
        if (validTitle && validTitle !== getNodeTitle(node['data'])) {
            dispatch(updateNodeTitle({ nodeId: id, newTitle: validTitle }))
        }
    }

    const nodeRunStatus: TaskStatus = node?.data?.taskStatus as TaskStatus
    const status = node?.data?.run ? 'completed' : ''

    let outlineColor = 'gray'

    switch (nodeRunStatus) {
        case 'PENDING':
            outlineColor = 'yellow'
            break
        case 'RUNNING':
            outlineColor = 'blue'
            break
        case 'COMPLETED':
            outlineColor = '#4CAF50'
            break
        case 'FAILED':
            outlineColor = 'red'
            break
        case 'CANCELED':
            outlineColor = 'gray'
            break
        default:
            if (status === 'completed') {
                outlineColor = '#4CAF50'
            }
    }

    return (
        <div className="w-full h-full group relative">
            {showTitleError && (
                <Alert
                    key={`alert-${id}`}
                    className="absolute -top-16 left-0 right-0 z-50"
                    color="danger"
                    onClose={() => setShowTitleError(false)}
                >
                    Title cannot contain whitespace. Use underscores instead.
                </Alert>
            )}
            <NodeResizer
                nodeId={id}
                isVisible={true}
                lineStyle={resizerLineStyle}
                minHeight={Math.max(100, minHeight)}
                minWidth={Math.max(200, minWidth)}
                handleStyle={resizerHandleStyle}
            />
            <div id="node-${id}" className="relative w-full h-full">
                {/* Hidden target handle covering the entire node */}
                <Handle
                    type="target"
                    position={Position.Left}
                    id={`node-body-${id}`}
                    style={staticStyles.targetHandle}
                    isConnectable={true}
                    isConnectableStart={false}
                />
                {/* Controls Card */}
                <Card
                    key={`controls-card-${id}`}
                    style={staticStyles.controlsCard}
                    className={`opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}
                    classNames={{
                        base: 'bg-background border-default-200 transition-opacity duration-200',
                    }}
                >
                    <div className="flex flex-row gap-1">
                        <Button key={`delete-btn-${id}`} isIconOnly radius="full" variant="light" onPress={onDelete}>
                            <Icon
                                key={`delete-icon-${id}`}
                                className="text-default-500"
                                icon="solar:trash-bin-trash-linear"
                                width={22}
                            />
                        </Button>
                    </div>
                </Card>
                <Card
                    id={`node-${id}-card`}
                    className={`absolute inset-0 transition-colors duration-200`}
                    style={{ outlineColor }}
                    classNames={{
                        base: `bg-background outline-offset-0 outline-solid-200
                        ${isSelected ? 'outline-[3px]' : status === 'completed' ? 'outline-[2px]' : 'outline-[1px]'} 
                        outline-default-200 group-hover:outline-[3px]`,
                    }}
                >
                    <CardHeader className="relative pt-2 pb-4 bg-background">
                        <div className="flex items-center">
                            {nodeConfig?.logo && (
                                <img src={nodeConfig.logo} alt="Node Logo" className="mr-2 max-h-8 max-w-8 mb-3" />
                            )}
                            {editingTitle ? (
                                <Input
                                    autoFocus
                                    value={titleInputValue}
                                    size="sm"
                                    variant="bordered"
                                    radius="lg"
                                    onChange={(e) => {
                                        const validValue = convertToPythonVariableName(e.target.value)
                                        setTitleInputValue(validValue)
                                        handleTitleChange(validValue)
                                    }}
                                    onBlur={() => setEditingTitle(false)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                            e.stopPropagation()
                                            e.preventDefault()
                                            setEditingTitle(false)
                                        }
                                    }}
                                    classNames={{
                                        input: 'text-foreground dark:text-white',
                                        inputWrapper: 'dark:bg-default-100/50 bg-default-100',
                                    }}
                                />
                            ) : (
                                <h3
                                    className="text-lg font-semibold text-center cursor-pointer hover:text-primary"
                                    onClick={() => {
                                        setTitleInputValue(getNodeTitle(node['data']))
                                        setEditingTitle(true)
                                    }}
                                >
                                    {nodeConfig?.title || 'Group'}
                                </h3>
                            )}
                        </div>
                        <div style={staticStyles.controlsContainer}>
                            <div style={tagStyle} className="node-acronym-tag">
                                {acronym}
                            </div>
                        </div>
                    </CardHeader>
                    {!isCollapsed && <Divider key={`divider-${id}`} />}
                    <CardBody className="px-1">
                        <div className={`${styles.handlesWrapper} bg-background`} ref={nodeRef}>
                            {renderHandles()}
                        </div>
                        {!isCollapsed && <Divider key={`divider-2-${id}`} className="mt-2" />}
                        <div
                            style={{ flexGrow: 1, minHeight: minHeight }}
                            id="child-node-container"
                            className="bg-none rounded-md mt-2"
                        >
                            {/* This div will expand to fill remaining space */}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}

type IsEqualCompareObj = {
    minWidth: number
    minHeight: number
    hasChildNodes: boolean
}

function customIsEqual(prev: IsEqualCompareObj, next: IsEqualCompareObj): boolean {
    return (
        prev.minWidth === next.minWidth &&
        prev.minHeight === next.minHeight &&
        prev.hasChildNodes === next.hasChildNodes
    )
}

export default memo(DynamicGroupNode)
