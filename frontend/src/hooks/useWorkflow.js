// frontend/src/hooks/useWorkflow.js
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRunStatus, startRun, getWorkflow } from '../utils/api';
import { 
    initializeFlow, 
    updateNodeData, 
    clearCanvas, 
    setProjectName, 
    nodesChange, 
    edgesChange, 
    connect, 
    setHoveredNode, 
    setSelectedNode, 
    deleteNode, 
    setWorkflowInputVariable 
} from '../store/flowSlice';
import { v4 as uuidv4 } from 'uuid';
import { useSaveWorkflow } from './useSaveWorkflow';
import { useModeStore } from '../store/modeStore';
import { getHelperLines } from '../utils/helperLines';

const useWorkflow = (workflowID, workflowData) => {
    const dispatch = useDispatch();

    
    const nodes = useSelector((state) => state.flow.nodes);
    const edges = useSelector((state) => state.flow.edges);
    const inputNodeValues = useSelector((state) => state.flow.inputNodeValues);
    const projectName = useSelector((state) => state.flow.projectName);
    const hoveredNode = useSelector((state) => state.flow.hoveredNode);
    const selectedNodeID = useSelector((state) => state.flow.selectedNode);
    const nodeTypesConfig = useSelector((state) => state.nodeTypes.data);
    const [isRunning, setIsRunning] = useState(false);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [helperLines, setHelperLines] = useState({ horizontal: null, vertical: null });
    const [hoveredEdge, setHoveredEdge] = useState(null);
    const [isPopoverContentVisible, setPopoverContentVisible] = useState(false);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const [edgeUpdateTrigger, setEdgeUpdateTrigger] = useState(0);
    const prevConnectionsRef = useRef('');
    const mode = useModeStore((state) => state.mode);
    const saveWorkflow = useSaveWorkflow([nodes, edges], 10000);

    const workflowInputVariables = useSelector((state) => {
        return state.flow.workflowInputVariables;
    });
    const setWorkflowInputVariableValue = useCallback((key, value) => {
        dispatch(setWorkflowInputVariable({ key, value }));
    }, [dispatch]);

    const updateWorkflowStatus = useCallback(async (runID) => {
        const checkStatusInterval = setInterval(async () => {
            try {
                const statusResponse = await getRunStatus(runID);
                const outputs = statusResponse.outputs;
                console.log('Status Response:', statusResponse);

                if (outputs) {
                    Object.entries(outputs).forEach(([nodeId, data]) => {
                        const node = nodes.find((node) => node.id === nodeId);
                        if (data) {
                            dispatch(updateNodeData({ id: nodeId, data: { status: data.status, run: { ...node.data.run, ...data } } }));
                        }
                    });
                }

                if (statusResponse.status !== 'RUNNING') {
                    setIsRunning(false);
                    clearInterval(checkStatusInterval);
                }
            } catch (error) {
                console.error('Error fetching workflow status:', error);
                clearInterval(checkStatusInterval);
            }
        }, 10000);
    }, [dispatch, nodes]);

    const handleRunWorkflow = useCallback(async () => {
        try {
            console.log('Input Node Values:', inputNodeValues);
            
            nodes.forEach(node => {
                dispatch(updateNodeData({ id: node.id, data: { status: 'pending' } }));
            });

            const test_inputs = {
                "initial_inputs": {
                    "node_1731066766087": { "user_message": "Give me weather in London" }
                }
            };
            const result = await startRun(workflowID, test_inputs, null, 'interactive');

            setIsRunning(true);
            updateWorkflowStatus(result.id);

        } catch (error) {
            console.error('Error starting workflow run:', error);
        }
    }, [dispatch, inputNodeValues, nodes, updateWorkflowStatus, workflowID]);

    const handleDownloadWorkflow = useCallback(async () => {
        try {
            const workflow = await getWorkflow(workflowID);
            const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.replace(/\s+/g, '_')}.json`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading workflow:', error);
        }
    }, [projectName, workflowID]);

    const onNodesChange = useCallback(
        (changes) => {
            if (!changes.some((c) => c.type === 'position')) {
                setHelperLines({ horizontal: null, vertical: null });
                dispatch(nodesChange({ changes }));
                return;
            }

            const positionChange = changes.find(
                (c) => c.type === 'position' && c.position
            );

            if (positionChange) {
                const { horizontal, vertical } = getHelperLines(positionChange, nodes);
                setHelperLines({ horizontal, vertical });

                if (horizontal || vertical) {
                    const snapPosition = { x: positionChange.position.x, y: positionChange.position.y };
                    if (horizontal) snapPosition.y = horizontal;
                    if (vertical) snapPosition.x = vertical;
                    positionChange.position = snapPosition;
                }
            }

            dispatch(nodesChange({ changes }));
        },
        [dispatch, nodes]
    );

    const onEdgesChange = useCallback(
        (changes) => dispatch(edgesChange({ changes })),
        [dispatch]
    );

    const onEdgeMouseEnter = useCallback(
        (event, edge) => {
            setHoveredEdge(edge.id);
    }, []);

    const onEdgeMouseLeave = useCallback(() => {
        setHoveredEdge(null);
    }, []);

    const onConnect = useCallback(
        (connection) => {
            const newEdge = {
                ...connection,
                id: uuidv4(),
                key: uuidv4(),
            };
            dispatch(connect({ connection: newEdge }));
        },
        [dispatch]
    );

    const onNodeMouseEnter = useCallback(
        (event, node) => {
            dispatch(setHoveredNode({ nodeId: node.id }));
        },
        [dispatch]
    );

    const onNodeMouseLeave = useCallback(() => {
        dispatch(setHoveredNode({ nodeId: null }));
    }, [dispatch]);

    const onNodeClick = useCallback(
        (event, node) => {
            dispatch(setSelectedNode({ nodeId: node.id }));
        },
        [dispatch]
    );

    const onPaneClick = useCallback(() => {
        if (selectedNodeID) {
            dispatch(setSelectedNode({ nodeId: null }));
        }
    }, [dispatch, selectedNodeID]);

    const onNodesDelete = useCallback(
        (deletedNodes) => {
            deletedNodes.forEach((node) => {
                dispatch(deleteNode({ nodeId: node.id }));

                if (selectedNodeID === node.id) {
                    dispatch(setSelectedNode({ nodeId: null }));
                }
            });
        },
        [dispatch, selectedNodeID]
    );

    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                const selectedNodes = nodes.filter(node => node.selected);
                if (selectedNodes.length > 0) {
                    onNodesDelete(selectedNodes);
                }
            }
        },
        [nodes, onNodesDelete]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    useEffect(() => {
        const newConnections = edges.map(edge =>
            `${edge.source}-${edge.sourceHandle}-${edge.target}-${edge.targetHandle}`
        ).join('|');

        const hasChanged = prevConnectionsRef.current !== newConnections;
        if (hasChanged) {
            prevConnectionsRef.current = newConnections;
            setEdgeUpdateTrigger(prev => prev + 1);
        }
    }, [edges]);

    const nodesWithMode = useMemo(() => {
        return nodes
            .filter(Boolean)
            .map(node => ({
                ...node,
                draggable: true,
                selectable: mode === 'pointer',
                position: node?.position,
                type: node?.type,
                data: node?.data,
            }));
    }, [nodes, mode]);

    return {
        nodes,
        edges,
        isRunning,
        selectedNodeID,
        hoveredNode,
        hoveredEdge,
        workflowInputVariables,
        setWorkflowInputVariableValue,
        handleRunWorkflow,
        handleDownloadWorkflow,
        handleClearCanvas: () => {
            if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
                dispatch(clearCanvas());
            }
        },
        handleProjectNameChange: (e) => {
            dispatch(setProjectName(e.target.value));
        },
        onNodesChange,
        onEdgesChange,
        onConnect,
        onNodeMouseEnter,
        onNodeMouseLeave,
        onEdgeMouseEnter,
        onEdgeMouseLeave,
        onNodeClick,
        onPaneClick,
        onNodesDelete,
        nodesWithMode,
        styledEdges: useMemo(() => {
            return edges.map((edge) => ({
                ...edge,
                type: 'custom',
                style: {
                    stroke: edge.id === hoveredEdge
                        ? 'black'
                        : edge.source === hoveredNode || edge.target === hoveredNode
                            ? 'black'
                            : '#555',
                    strokeWidth: edge.id === hoveredEdge
                        ? 4
                        : edge.source === hoveredNode || edge.target === hoveredNode
                            ? 4
                            : 2,
                },
                data: {
                    ...edge.data,
                    showPlusButton: edge.id === hoveredEdge,
                    onPopoverOpen: ({ sourceNode, targetNode, edgeId }) => {
                        const centerX = (sourceNode.position.x + targetNode.position.x) / 2;
                        const centerY = (sourceNode.position.y + targetNode.position.y) / 2;
                        const screenPos = reactFlowInstance.flowToScreenPosition({
                            x: centerX,
                            y: centerY,
                        });

                        setPopoverPosition({
                            x: screenPos.x,
                            y: screenPos.y
                        });
                        setSelectedEdge({ sourceNode, targetNode, edgeId });
                        setPopoverContentVisible(true);
                    },
                },
                key: edge.id,
            }));
        }, [edges, hoveredNode, hoveredEdge, reactFlowInstance]),
        edgeUpdateTrigger,
        isPopoverContentVisible,
        popoverPosition,
        setPopoverContentVisible,
        nodeTypesConfig,
        saveWorkflow,
    };
};

export default useWorkflow;