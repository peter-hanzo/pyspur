import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
    ReactFlow,
    Background,
    ReactFlowProvider,
    Edge,
    EdgeTypes,
    ReactFlowInstance,
    SelectionMode,
    ConnectionMode,
    Node,
    useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useSelector, useDispatch } from 'react-redux'
import { Panel } from '@xyflow/react'
import Operator from './footer/Operator'
import { setSelectedNode, deleteNode, setNodes, setSelectedEdgeId } from '../../store/flowSlice'
import { FlowWorkflowNode, FlowWorkflowEdge } from '@/types/api_types/nodeTypeSchemas'
import { Dropdown, DropdownMenu, DropdownItem, DropdownTrigger, Button, Tooltip } from '@heroui/react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import CustomEdge from './Edge'
import HelperLinesRenderer from '../HelperLines'
import useCopyPaste from '../../utils/useCopyPaste'
import { useModeStore } from '../../store/modeStore'
import { initializeFlow } from '../../store/flowSlice'
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow'
import LoadingSpinner from '../LoadingSpinner'
import CollapsibleNodePanel from '../nodes/CollapsibleNodePanel'
import { setNodePanelExpanded } from '../../store/panelSlice'
import { insertNodeBetweenNodes, useAdjustGroupNodesZIndex } from '../../utils/flowUtils'
import { getLayoutedNodes } from '@/utils/nodeLayoutUtils'
import { WorkflowCreateRequest } from '@/types/api_types/workflowSchemas'
import { RootState } from '../../store/store'
import { useNodeTypes, useStyledEdges, useNodesWithMode, useFlowEventHandlers } from '../../utils/flowUtils'
import isEqual from 'lodash/isEqual'
import { onNodeDragOverGroupNode, onNodeDragStopOverGroupNode } from '../nodes/loops/groupNodeUtils'
import { MouseEvent as ReactMouseEvent } from 'react'
import { throttle } from 'lodash'
import { Icon } from '@iconify/react'
import { toPng } from 'html-to-image'
import NodeSidebar from '../nodes/nodeSidebar/NodeSidebar'
import Chat from '../chat/Chat'

interface ChatCanvasProps {
    workflowData?: WorkflowCreateRequest
    workflowID?: string
    onDownloadImageInit?: (handler: () => void) => void
}

interface HelperLines {
    horizontal: number | null
    vertical: number | null
}

const edgeTypes: EdgeTypes = {
    custom: CustomEdge,
}

// Create a wrapper component that includes ReactFlow logic
const ChatCanvasContent: React.FC<ChatCanvasProps> = ({ workflowData, workflowID, onDownloadImageInit }) => {
    const dispatch = useDispatch()
    const projectName = useSelector((state: RootState) => state.flow.projectName)

    // Resize control state
    const [chatWidth, setChatWidth] = useState(400) // Default chat panel width
    const [isResizing, setIsResizing] = useState(false)
    const [showChat, setShowChat] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    const nodeTypesConfig = useSelector((state: RootState) => state.nodeTypes.data)

    const { nodeTypes, isLoading } = useNodeTypes({
        nodeTypesConfig,
        readOnly: false,
        includeCoalesceNode: true,
    })

    useEffect(() => {
        if (workflowData) {
            dispatch(
                initializeFlow({
                    nodeTypes: nodeTypesConfig,
                    definition: workflowData.definition,
                    workflowID: workflowID,
                    name: workflowData.name,
                })
            )
        }
    }, [dispatch, workflowData, workflowID, nodeTypesConfig])

    const nodes = useSelector((state: RootState) => state.flow.nodes, isEqual)
    const edges = useSelector((state: RootState) => state.flow.edges, isEqual)
    const nodeConfigs = useSelector((state: RootState) => state.flow.nodeConfigs, isEqual)
    const selectedNodeID = useSelector((state: RootState) => state.flow.selectedNode)
    const selectedEdgeId = useSelector((state: RootState) => state.flow.selectedEdgeId)

    const saveWorkflow = useSaveWorkflow()

    useEffect(() => {
        if (nodes.length > 0 || edges.length > 0 || Object.keys(nodeConfigs).length > 0) {
            saveWorkflow()
        }
    }, [nodes, edges, nodeConfigs, saveWorkflow])

    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
    const [helperLines, setHelperLines] = useState<HelperLines>({
        horizontal: null,
        vertical: null,
    })
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
    const [isPopoverContentVisible, setPopoverContentVisible] = useState(false)
    const [selectedEdge, setSelectedEdge] = useState<{
        sourceNode: FlowWorkflowNode
        targetNode: FlowWorkflowNode
        edgeId: string
    } | null>(null)
    const [popoverPosition, setPopoverPosition] = useState<{
        x: number
        y: number
    }>({ x: 0, y: 0 })

    const showHelperLines = false

    const mode = useModeStore((state) => state.mode)

    const { getIntersectingNodes, getNodes, updateNode } = useReactFlow()

    const handlePopoverOpen = useCallback(
        ({
            sourceNode,
            targetNode,
            edgeId,
        }: {
            sourceNode: FlowWorkflowNode
            targetNode: FlowWorkflowNode
            edgeId: string
        }) => {
            if (!reactFlowInstance) return

            const centerX = (sourceNode.position.x + targetNode.position.x) / 2
            const centerY = (sourceNode.position.y + targetNode.position.y) / 2

            const screenPos = reactFlowInstance.flowToScreenPosition({
                x: centerX,
                y: centerY,
            })

            setPopoverPosition({
                x: screenPos.x,
                y: screenPos.y,
            })
            setSelectedEdge({ sourceNode, targetNode, edgeId })
            setPopoverContentVisible(true)
        },
        [reactFlowInstance]
    )

    const { onNodesChange, onEdgesChange, onConnect, onNodeDragStop: onNodeDragStopThrottled } = useFlowEventHandlers({
        dispatch,
        nodes,
        setHelperLines,
    })

    const styledEdges = useStyledEdges({
        edges,
        hoveredNode,
        hoveredEdge,
        selectedEdgeId,
        handlePopoverOpen,
    })

    const nodesWithMode = useNodesWithMode({
        nodes,
        mode: mode as 'pointer' | 'hand',
    })

    const nodesWithAdjustedZIndex = useAdjustGroupNodesZIndex({ nodes: nodesWithMode })

    const onEdgeMouseEnter = useCallback(
        (_: React.MouseEvent, edge: Edge) => {
            setHoveredEdge(edge.id)
        },
        [setHoveredEdge]
    )

    const onEdgeMouseLeave = useCallback(() => {
        setHoveredEdge(null)
    }, [setHoveredEdge])

    const onInit = useCallback((instance: ReactFlowInstance) => {
        setReactFlowInstance(instance)
        instance.setViewport({ x: 0, y: 0, zoom: 0.8 })
    }, [])

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: FlowWorkflowNode) => {
            dispatch(setSelectedNode({ nodeId: node.id }))
        },
        [dispatch]
    )

    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        dispatch(setSelectedEdgeId({ edgeId: edge.id }))
    }, [dispatch])

    const onPaneClick = useCallback(() => {
        if (selectedNodeID) {
            dispatch(setSelectedNode({ nodeId: null }))
        }
        if (selectedEdgeId) {
            dispatch(setSelectedEdgeId({ edgeId: null }))
        }
        dispatch(setNodePanelExpanded(false))
    }, [dispatch, selectedNodeID, selectedEdgeId])

    const onNodesDelete = useCallback(
        (deletedNodes: FlowWorkflowNode[]) => {
            deletedNodes.forEach((node) => {
                dispatch(deleteNode({ nodeId: node.id }))

                if (selectedNodeID === node.id) {
                    dispatch(setSelectedNode({ nodeId: null }))
                }
            })
        },
        [dispatch, selectedNodeID]
    )

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const tagName = target.tagName.toLowerCase();
            if (target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                return;
            }

            // Get the node panel state
            const nodePanelElement = document.querySelector('[data-node-panel]');
            const isNodePanelExpanded = nodePanelElement?.getAttribute('data-expanded') === 'true';
            const isNodePanelFocused = nodePanelElement?.contains(document.activeElement);

            // Only handle delete/backspace regardless of panel state
            if (event.key === 'Delete' || event.key === 'Backspace') {
                const selectedNodes = nodes.filter((node) => node.selected);
                if (selectedNodes.length > 0) {
                    onNodesDelete(selectedNodes);
                }
                return;
            }

            // Don't handle arrow keys if node panel is expanded and focused
            if (isNodePanelExpanded && isNodePanelFocused) {
                return;
            }

            // Pan amount per keypress (adjust this value to control pan speed)
            const BASE_PAN_AMOUNT = 15;
            const PAN_AMOUNT = event.shiftKey ? BASE_PAN_AMOUNT * 3 : BASE_PAN_AMOUNT;

            if (reactFlowInstance) {
                const { x, y, zoom } = reactFlowInstance.getViewport();

                switch (event.key) {
                    case 'ArrowLeft':
                        reactFlowInstance.setViewport({ x: x + PAN_AMOUNT, y, zoom });
                        break;
                    case 'ArrowRight':
                        reactFlowInstance.setViewport({ x: x - PAN_AMOUNT, y, zoom });
                        break;
                    case 'ArrowUp':
                        reactFlowInstance.setViewport({ x, y: y + PAN_AMOUNT, zoom });
                        break;
                    case 'ArrowDown':
                        reactFlowInstance.setViewport({ x, y: y - PAN_AMOUNT, zoom });
                        break;
                }
            }
        },
        [nodes, onNodesDelete, reactFlowInstance]
    );

    const handleLayout = useCallback(() => {
        const layoutedNodes = getLayoutedNodes(nodes as FlowWorkflowNode[], edges as FlowWorkflowEdge[])
        dispatch(setNodes({ nodes: layoutedNodes }))
    }, [nodes, edges, dispatch])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [handleKeyDown])

    useKeyboardShortcuts(selectedNodeID, nodes, nodeTypes, nodeTypesConfig, dispatch, handleLayout)

    const { cut, copy, paste, bufferedNodes } = useCopyPaste()
    useCopyPaste()

    const proOptions = {
        hideAttribution: true,
    }

    const onNodeMouseEnter = useCallback(
        (_: React.MouseEvent, node: FlowWorkflowNode) => {
            setHoveredNode(node.id)
        },
        [setHoveredNode]
    )

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null)
    }, [setHoveredNode])

    const handleAddNodeBetween = useCallback(
        (nodeName: string, sourceNode: FlowWorkflowNode, targetNode: FlowWorkflowNode, edgeId: string) => {
            insertNodeBetweenNodes(nodes, nodeTypesConfig, nodeName, sourceNode, targetNode, edgeId, dispatch, () =>
                setPopoverContentVisible(false)
            )
        },
        [nodes, nodeTypesConfig, dispatch, setPopoverContentVisible]
    )

    const onNodeDrag = useCallback(
        throttle((event: ReactMouseEvent, node: Node) => {
            onNodeDragOverGroupNode(event, node, nodes, dispatch, getIntersectingNodes, getNodes, updateNode)
        }, 16),
        [nodes, dispatch, getIntersectingNodes]
    )

    const onNodeDragStop = useCallback(
        (event: ReactMouseEvent, node: Node) => {
            onNodeDragStopOverGroupNode(event, node, nodes, edges, dispatch, getIntersectingNodes, getNodes, updateNode)
            onNodeDragStopThrottled(event, node)
        },
        [nodes, edges, dispatch, getIntersectingNodes, getNodes, updateNode, onNodeDragStopThrottled]
    )

    const handleDownloadImage = useCallback(() => {
        const flowContainer = document.querySelector('.react-flow__viewport') as HTMLElement
        if (!flowContainer) return

        toPng(flowContainer, {
            backgroundColor: 'transparent',
            width: flowContainer.clientWidth,
            height: flowContainer.clientHeight,
        })
            .then((dataUrl) => {
                const a = document.createElement('a')
                a.href = dataUrl
                a.download = `${projectName}.png`
                a.click()
            })
            .catch((err) => {
                console.error('Failed to download image', err)
            })
    }, [projectName])

    useEffect(() => {
        if (onDownloadImageInit) {
            onDownloadImageInit(handleDownloadImage)
        }
    }, [handleDownloadImage, onDownloadImageInit])

    // Handle resizing of chat panel
    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true)
        e.preventDefault()
    }, [])

    const stopResizing = useCallback(() => {
        setIsResizing(false)
    }, [])

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect()
                const newWidth = containerRect.right - e.clientX

                // Set minimum and maximum width constraints
                if (newWidth > 200 && newWidth < (containerRect.width * 0.8)) {
                    setChatWidth(newWidth)
                }
            }
        },
        [isResizing]
    )

    useEffect(() => {
        window.addEventListener('mousemove', resize)
        window.addEventListener('mouseup', stopResizing)

        return () => {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
    }, [resize, stopResizing])

    const toggleChatPanel = () => {
        setShowChat(prev => !prev)
    }

    if (isLoading) {
        return <LoadingSpinner />
    }

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full overflow-hidden"
            style={{ cursor: isResizing ? 'col-resize' : 'default' }}
        >
            {/* React Flow Canvas */}
            <div className="flex-grow relative h-full overflow-hidden">
                <ReactFlow
                    nodes={nodesWithAdjustedZIndex}
                    edges={styledEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    onInit={onInit}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    onNodesDelete={onNodesDelete}
                    proOptions={proOptions}
                    panOnDrag={mode === 'hand' && !nodes.filter(Boolean).some((n) => n.selected)}
                    panOnScroll={true}
                    zoomOnScroll={true}
                    minZoom={0.1}
                    maxZoom={2}
                    selectionMode={mode === 'pointer' ? SelectionMode.Full : SelectionMode.Partial}
                    selectNodesOnDrag={mode === 'pointer'}
                    selectionOnDrag={mode === 'pointer'}
                    selectionKeyCode={mode === 'pointer' ? null : 'Shift'}
                    multiSelectionKeyCode={mode === 'pointer' ? null : 'Shift'}
                    deleteKeyCode="Delete"
                    nodesConnectable={true}
                    connectionMode={ConnectionMode.Loose}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    onEdgeMouseEnter={onEdgeMouseEnter}
                    onEdgeMouseLeave={onEdgeMouseLeave}
                    snapToGrid={false}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                >
                    <Background />
                    {showHelperLines && (
                        <HelperLinesRenderer horizontal={helperLines.horizontal} vertical={helperLines.vertical} />
                    )}
                    <Operator handleLayout={handleLayout} handleDownloadImage={handleDownloadImage} />

                    {/* Toggle Chat Panel Button */}
                    <Panel position="top-right">
                        <Tooltip content={showChat ? "Hide Chat" : "Show Chat"}>
                            <Button
                                isIconOnly
                                variant="flat"
                                size="sm"
                                onPress={toggleChatPanel}
                                aria-label={showChat ? "Hide Chat" : "Show Chat"}
                            >
                                <Icon
                                    icon={showChat ? "lucide:panel-right-close" : "lucide:panel-right-open"}
                                    width={20}
                                />
                            </Button>
                        </Tooltip>
                    </Panel>
                </ReactFlow>

                {/* Node Sidebar */}
                {selectedNodeID && (
                    <div
                        className="absolute top-0 right-0 h-full bg-white border-l border-gray-200"
                        style={{ zIndex: 2 }}
                    >
                        <NodeSidebar nodeID={selectedNodeID} key={selectedNodeID} readOnly={false} />
                    </div>
                )}

                {/* Node Panel */}
                <div className="border-gray-200 absolute top-4 left-4" style={{ zIndex: 2 }}>
                    <CollapsibleNodePanel />
                </div>
            </div>

            {/* Chat Panel Resizer */}
            {showChat && (
                <div
                    className="w-1 bg-border hover:bg-primary cursor-col-resize h-full relative z-10"
                    onMouseDown={startResizing}
                />
            )}

            {/* Chat Panel */}
            {showChat && (
                <div
                    className="h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col"
                    style={{ width: `${chatWidth}px` }}
                >
                    <div className="w-full h-full overflow-auto">
                        <Chat
                            workflowID={workflowID}
                            onSendMessage={async (message) => {
                                console.log("Processing message through workflow:", message);

                                // TODO: In the future, implement actual workflow execution:
                                // 1. Create a session ID if none exists
                                // 2. Collect message history
                                // 3. Send to workflow execution engine with proper inputs
                                // 4. Return the response

                                // Simulate network delay for now
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        console.log("Message processed by workflow:", workflowID);
                                        resolve();
                                    }, 1500);
                                });
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// Main component that provides the ReactFlow context
const ChatCanvas: React.FC<ChatCanvasProps> = ({ workflowData, workflowID, onDownloadImageInit }) => {
    return (
        <ReactFlowProvider>
            <ChatCanvasContent
                workflowData={workflowData}
                workflowID={workflowID}
                onDownloadImageInit={onDownloadImageInit}
            />
        </ReactFlowProvider>
    )
}

export default ChatCanvas
