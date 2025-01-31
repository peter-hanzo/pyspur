import usePartialRun from '@/hooks/usePartialRun'
import store, { RootState } from '@/store/store'
import { AlertState } from '@/types/alert'
import { FlowWorkflowNode } from '@/types/api_types/nodeTypeSchemas'
import { TaskStatus } from '@/types/api_types/taskSchemas'
import { deleteNode, duplicateNode, getNodeTitle } from '@/utils/flowUtils'
import { convertToPythonVariableName } from '@/utils/variableNameUtils'
import { Alert, Button, Card, CardBody, CardHeader, Divider, Input, Spinner } from '@heroui/react'
import { Icon } from '@iconify/react'
import { createSelector } from '@reduxjs/toolkit'
import { Handle, Position, useConnection } from '@xyflow/react'
import isEqual from 'lodash/isEqual'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateNodeDataOnly, updateNodeTitle } from '../../store/flowSlice'

const PUBLIC_URL = typeof window !== 'undefined' ? `http://${window.location.host}/` : 'http://localhost:6080/'

export interface BaseNodeProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    id: string
    data?: FlowWorkflowNode['data']
    children?: React.ReactNode
    style?: React.CSSProperties
    isInputNode?: boolean
    className?: string
    handleOpenModal?: (isModalOpen: boolean) => void
    positionAbsoluteX?: number
    positionAbsoluteY?: number
}

const staticStyles = {
    container: {
        position: 'relative' as const,
    },
    targetHandle: {
        top: '50%',
        left: 0,
        width: '30%',
        height: '100%',
        zIndex: 10,
        opacity: 0,
        pointerEvents: 'auto' as const,
    },
    dragHandle: {
        width: '100%',
        height: '100%',
        pointerEvents: 'none' as const,
    },
    controlsCard: {
        position: 'absolute' as const,
        top: '-45px',
        right: '0px',
        padding: '8px',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'var(--background)',
        border: '1px solid var(--default-200)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        pointerEvents: 'auto' as const,
    },
    baseTag: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        color: '#fff',
        fontWeight: '500',
        letterSpacing: '0.025em',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    collapseButton: {
        minWidth: 'auto',
        height: '28px',
        width: '28px',
        padding: '0',
        fontSize: '0.8rem',
        marginRight: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        backgroundColor: 'var(--background)',
        border: '1px solid var(--default-200)',
    },
    controlsContainer: {
        position: 'absolute' as const,
        top: '8px',
        right: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
} as const

const baseNodeComparator = (prev: BaseNodeProps, next: BaseNodeProps) => {
    // Compare only the props that would trigger a meaningful visual change
    return (
        prev.isCollapsed === next.isCollapsed &&
        prev.id === next.id &&
        isEqual(prev.data, next.data) &&
        isEqual(prev.style, next.style) &&
        prev.isInputNode === next.isInputNode &&
        prev.className === next.className &&
        prev.positionAbsoluteX === next.positionAbsoluteX &&
        prev.positionAbsoluteY === next.positionAbsoluteY
    )
}

const selectInitialInputs = createSelector(
    (state: RootState) => state.flow.nodes,
    (state: RootState) => state.flow.testInputs,
    (nodes, testInputs) => {
        const inputNode = nodes.find((node) => node.type === 'InputNode')
        const inputNodeId = inputNode?.data?.title || inputNode?.id
        if (testInputs && Array.isArray(testInputs) && testInputs.length > 0) {
            const { id, ...rest } = testInputs[0]
            return { [inputNodeId as string]: rest }
        }
        return { [inputNodeId as string]: {} }
    }
)

const selectAvailableOutputs = createSelector([(state: RootState) => state.flow.nodes], (nodes) => {
    const outputs: Record<string, any> = {}
    nodes.forEach((node) => {
        if (node.data?.run) {
            outputs[node.data?.title || node.id] = node.data.run
        }
    })
    return outputs
})

const BaseNode: React.FC<BaseNodeProps> = ({
    isCollapsed,
    setIsCollapsed,
    handleOpenModal,
    id,
    data,
    children,
    style = {},
    isInputNode = false,
    className = '',
    positionAbsoluteX,
    positionAbsoluteY,
}) => {
    const [editingTitle, setEditingTitle] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [titleInputValue, setTitleInputValue] = useState('')
    const [alert, setAlert] = useState<AlertState>({
        message: '',
        color: 'default',
        isVisible: false,
    })
    const dispatch = useDispatch()

    const connection = useConnection()

    // Only keep the selectors we need for this component's functionality
    const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode)

    const initialInputs = useSelector(selectInitialInputs, isEqual)

    const availableOutputs = useSelector(selectAvailableOutputs, isEqual)

    const { executePartialRun, loading } = usePartialRun(dispatch)

    const showAlert = (message: string, color: AlertState['color']) => {
        setAlert({ message, color, isVisible: true })
        setTimeout(() => setAlert((prev) => ({ ...prev, isVisible: false })), 3000)
    }

    const handleDelete = () => {
        deleteNode(id, selectedNodeId, dispatch)
    }

    const handleDuplicate = () => {
        if (!data || !positionAbsoluteX || !positionAbsoluteY) {
            console.error('Node position not found')
            return
        }

        duplicateNode(id, positionAbsoluteX, positionAbsoluteY, dispatch, store.getState as () => RootState)
    }

    const handlePartialRun = async () => {
        if (!data) {
            return
        }
        setIsRunning(true)
        // Clear the current node's run data before starting new run
        dispatch(
            updateNodeDataOnly({
                id,
                data: {
                    run: undefined,
                    taskStatus: 'RUNNING',
                    error: undefined,
                },
            })
        )

        const rerunPredecessors = false
        const workflowId = window.location.pathname.split('/').pop()
        if (!workflowId) return

        try {
            const result = await executePartialRun({
                workflowId,
                nodeId: data.title,
                initialInputs,
                partialOutputs: availableOutputs,
                rerunPredecessors,
            })

            if (result) {
                showAlert('Node execution completed successfully', 'success')
            }
        } catch (error: any) {
            console.error('Error running node:', error)
            const errorMessage =
                error.response?.data?.detail || 'Node execution failed. Please check the inputs and try again.'
            showAlert(errorMessage, 'danger')
        } finally {
            setIsRunning(false)
        }
    }

    const isSelected = String(id) === String(selectedNodeId)

    const status = data.run ? 'completed' : ''

    const nodeRunStatus: TaskStatus = data.taskStatus as TaskStatus

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

    const { backgroundColor, ...restStyle } = style || {}

    const cardStyle = React.useMemo(
        () => ({
            ...restStyle,
            outlineColor,
            outlineStyle: 'solid',
            outlineOffset: '0',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto' as const,
        }),
        [restStyle, outlineColor]
    )

    const acronym = data.acronym || 'N/A'
    const color = data.color || '#ccc'

    const tagStyle = React.useMemo(
        () => ({
            ...staticStyles.baseTag,
            backgroundColor: color,
        }),
        [color]
    )

    const handleTitleChange = (newTitle: string) => {
        const validTitle = convertToPythonVariableName(newTitle)
        if (validTitle && validTitle !== getNodeTitle(data)) {
            dispatch(updateNodeTitle({ nodeId: id, newTitle: validTitle }))
        }
    }

    const headerStyle = React.useMemo(
        () => ({
            position: 'relative' as const,
            paddingTop: '8px',
            paddingBottom: isCollapsed ? '0px' : '16px',
        }),
        [isCollapsed]
    )

    const titleStyle = React.useMemo(
        () => ({
            marginBottom: isCollapsed ? '4px' : '8px',
        }),
        [isCollapsed]
    )

    return (
        <>
            {alert.isVisible && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Alert color={alert.color}>{alert.message}</Alert>
                </div>
            )}
            <div style={staticStyles.container} draggable={false} className="group" id={`node-${id}`}>
                <div>
                    {connection.inProgress && (
                        <Handle
                            key={`handle-${id}`}
                            type="target"
                            position={Position.Left}
                            id={`node-body-${id}`}
                            style={staticStyles.targetHandle}
                            isConnectable={true}
                            isConnectableStart={false}
                        />
                    )}

                    <div className="react-flow__node-drag-handle" style={staticStyles.dragHandle}>
                        <Card
                            key={`card-${id}`}
                            className={`base-node ${className || ''}`}
                            style={cardStyle}
                            classNames={{
                                base: `bg-background outline-default-200 ${
                                    isSelected
                                        ? 'outline-[3px]'
                                        : status === 'completed'
                                          ? 'outline-[2px]'
                                          : 'outline-[1px]'
                                } group-hover:outline-[3px]`,
                            }}
                        >
                            {data && (
                                <CardHeader key={`header-${id}`} style={headerStyle}>
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
                                                inputWrapper:
                                                    'dark:bg-default-100/50 bg-default-100/50 backdrop-blur-sm',
                                            }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {data.logo && (
                                                <img
                                                    src={`${PUBLIC_URL}` + data.logo}
                                                    alt="Node Logo"
                                                    className="mr-2 max-h-8 max-w-8 mb-3"
                                                />
                                            )}
                                            <h3
                                                className="text-lg font-semibold text-center cursor-pointer hover:text-primary transition-colors dark:text-white"
                                                style={titleStyle}
                                                onClick={() => {
                                                    setTitleInputValue(getNodeTitle(data))
                                                    setEditingTitle(true)
                                                }}
                                            >
                                                {getNodeTitle(data)}
                                            </h3>
                                        </div>
                                    )}

                                    <div style={staticStyles.controlsContainer}>
                                        <Button
                                            key={`collapse-btn-${id}`}
                                            size="sm"
                                            variant="flat"
                                            className="dark:bg-default-100/20 dark:border-default-700"
                                            style={staticStyles.collapseButton}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsCollapsed(!isCollapsed)
                                            }}
                                        >
                                            <Icon
                                                icon={
                                                    isCollapsed
                                                        ? 'solar:alt-arrow-down-linear'
                                                        : 'solar:alt-arrow-up-linear'
                                                }
                                                width={16}
                                                className="text-default-600 dark:text-default-400"
                                            />
                                        </Button>

                                        <div style={tagStyle} className="node-acronym-tag">
                                            {acronym}
                                        </div>
                                    </div>
                                </CardHeader>
                            )}
                            {!isCollapsed && <Divider key={`divider-${id}`} className="dark:bg-default-700" />}

                            <CardBody key={`body-${id}`} className="px-3 py-2">
                                {children}
                            </CardBody>
                        </Card>
                    </div>
                </div>

                {/* Controls */}
                <Card
                    key={`controls-card-${id}`}
                    style={staticStyles.controlsCard}
                    className={`opacity-0 group-hover:opacity-100 dark:bg-default-100/20 dark:border-default-700 shadow-lg dark:shadow-lg-dark`}
                    classNames={{
                        base: 'bg-background/80 border-default-200 transition-all duration-200',
                    }}
                >
                    <div className="flex flex-row gap-2">
                        <Button
                            key={`run-btn-${id}`}
                            isIconOnly
                            radius="lg"
                            variant="light"
                            onPress={handlePartialRun}
                            disabled={loading || isRunning}
                            className="hover:bg-primary/20"
                        >
                            {isRunning ? (
                                <Spinner key={`spinner-${id}`} size="sm" color="current" />
                            ) : (
                                <Icon
                                    key={`play-icon-${id}`}
                                    className="text-default-600 dark:text-default-400"
                                    icon="solar:play-linear"
                                    width={22}
                                />
                            )}
                        </Button>
                        {!isInputNode && (
                            <Button
                                key={`delete-btn-${id}`}
                                isIconOnly
                                radius="lg"
                                variant="light"
                                onPress={handleDelete}
                            >
                                <Icon
                                    key={`delete-icon-${id}`}
                                    className="text-default-600 dark:text-default-400"
                                    icon="solar:trash-bin-trash-linear"
                                    width={22}
                                />
                            </Button>
                        )}
                        <Button
                            key={`duplicate-btn-${id}`}
                            isIconOnly
                            radius="lg"
                            variant="light"
                            onPress={handleDuplicate}
                        >
                            <Icon
                                key={`duplicate-icon-${id}`}
                                className="text-default-600 dark:text-default-400"
                                icon="solar:copy-linear"
                                width={22}
                            />
                        </Button>
                        {handleOpenModal && data?.run !== undefined && (
                            <Button
                                key={`modal-btn-${id}`}
                                isIconOnly
                                radius="lg"
                                variant="light"
                                onPress={() => handleOpenModal(true)}
                            >
                                <Icon
                                    key={`view-icon-${id}`}
                                    className="text-default-600 dark:text-default-400"
                                    icon="solar:eye-linear"
                                    width={22}
                                />
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </>
    )
}

export default BaseNode
