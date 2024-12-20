import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteNode, setSelectedNode, updateNodeData, addNode, setEdges, updateNodeTitle } from '../../store/flowSlice';
import { Handle, getConnectedEdges, Node, Edge, Position } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Button,
  Input,
  Alert,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import usePartialRun from '../../hooks/usePartialRun';
import { TaskStatus } from '@/types/api_types/taskSchemas';
import isEqual from 'lodash/isEqual';
import { FlowWorkflowNode } from '@/store/flowSlice';

interface NodeData {
  run?: Record<string, any>;
  status?: string;
  acronym?: string;
  color?: string;
  title?: string;
  config?: {
    title?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface RootState {
  flow: {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;
    testInputs?: Array<{ id: string;[key: string]: any }>;
  };
}

interface BaseNodeProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  id: string;
  data?: NodeData;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  isInputNode?: boolean;
  className?: string;
  handleOpenModal?: (isModalOpen: boolean) => void;
}

const getNodeTitle = (data: NodeData = {}): string => {
  return data.config?.title || data.title || data.type || 'Untitled';
};

const nodeComparator = (prevNode: FlowWorkflowNode, nextNode: FlowWorkflowNode) => {
  if (!prevNode || !nextNode) return false;
  // Skip position and measured properties when comparing nodes
  const { position: prevPosition, measured: prevMeasured, ...prevRest } = prevNode;
  const { position: nextPosition, measured: nextMeasured, ...nextRest } = nextNode;
  return isEqual(prevRest, nextRest);
};

const nodesComparator = (prevNodes: FlowWorkflowNode[], nextNodes: FlowWorkflowNode[]) => {
  if (!prevNodes || !nextNodes) return false;
  if (prevNodes.length !== nextNodes.length) return false;
  return prevNodes.every((node, index) => nodeComparator(node, nextNodes[index]));
};

const staticStyles = {
  container: {
    position: 'relative' as const
  },
  targetHandle: {
    top: '50%',
    left: 0,
    width: '30%',
    height: '100%',
    zIndex: 10,
    opacity: 0,
    pointerEvents: 'auto' as const
  },
  dragHandle: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const
  },
  controlsCard: {
    position: 'absolute' as const,
    top: '-50px',
    right: '0px',
    padding: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto' as const
  },
  baseTag: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    display: 'inline-block',
    color: '#fff'
  },
  collapseButton: {
    minWidth: 'auto',
    height: '24px',
    padding: '0 8px',
    fontSize: '0.8rem',
    marginRight: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlsContainer: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center'
  }
} as const;

const convertToPythonVariableName = (str: string): string => {
  // Replace spaces and hyphens with underscores
  str = str.replace(/[\s-]/g, '_');

  // Remove any non-alphanumeric characters except underscores
  str = str.replace(/[^a-zA-Z0-9_]/g, '');

  // Ensure the first character is a letter or underscore
  if (!/^[a-zA-Z_]/.test(str)) {
    str = '_' + str;
  }

  return str;
};

const BaseNode: React.FC<BaseNodeProps> = ({
  isCollapsed,
  setIsCollapsed,
  handleOpenModal, id,
  data = {},
  children,
  style = {},
  isInputNode = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  const dispatch = useDispatch();

  // Retrieve the node's position and edges from the Redux store
  const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id), nodeComparator);
  const edges = useSelector((state: RootState) => state.flow.edges);
  const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode);

  const initialInputs = useSelector((state: RootState) => {
    const inputNodeId = state.flow?.nodes.find((node) => node.type === 'InputNode')?.id;
    let testInputs = state.flow?.testInputs;
    if (testInputs && Array.isArray(testInputs) && testInputs.length > 0) {
      const { id, ...rest } = testInputs[0];
      return { [inputNodeId as string]: rest };
    }
    return { [inputNodeId as string]: {} };
  }, isEqual);

  const availableOutputs = useSelector((state: RootState) => {
    const nodes = state.flow.nodes.map(node => ({
      id: node.id,
      data: {
        run: node.data?.run
      }
    }));

    const outputs: Record<string, any> = {};
    nodes.forEach((node) => {
      if (node.data && node.data.run) {
        outputs[node.id] = node.data.run;
      }
    });
    return outputs;
  }, isEqual);

  const { executePartialRun, loading } = usePartialRun();

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowControls(true);
  }, [setIsHovered, setShowControls]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isTooltipHovered) {
      setTimeout(() => {
        setShowControls(false);
      }, 200);
    }
  }, [setIsHovered, setShowControls, isTooltipHovered]);

  const handleControlsMouseEnter = useCallback(() => {
    setShowControls(true);
    setIsTooltipHovered(true);
  }, [setShowControls, setIsTooltipHovered]);

  const handleControlsMouseLeave = useCallback(() => {
    setIsTooltipHovered(false);
    setTimeout(() => {
      if (!isHovered) {
        setShowControls(false);
      }
    }, 300);
  }, [isHovered, setShowControls, setIsTooltipHovered]);

  const handleDelete = () => {
    dispatch(deleteNode({ nodeId: id }));
    if (selectedNodeId === id) {
      dispatch(setSelectedNode({ nodeId: null }));
    }
  };

  const handlePartialRun = () => {
    if (!node) {
      return;
    }
    setIsRunning(true);
    const rerunPredecessors = false;

    const workflowId = window.location.pathname.split('/').pop();
    if (!workflowId) return;

    executePartialRun({
      workflowId,
      nodeId: id,
      inputs: initialInputs,
      availableOutputs,
      rerunPredecessors
    }).then((result) => {
      if (result) {
        Object.entries(result).forEach(([nodeId, output_values]) => {
          if (output_values) {
            dispatch(updateNodeData({
              id: nodeId,
              data: {
                run: {
                  ...(node?.data?.run || {}),
                  ...(output_values || {})
                }
              }
            }));
            dispatch(setSelectedNode({ nodeId }));
          }
        });
      }
    }).finally(() => {
      setIsRunning(false);
    });
  };

  const handleDuplicate = () => {
    if (!node || !node.position) {
      console.error('Node position not found');
      return;
    }

    // Get all edges connected to the current node
    const connectedEdges = getConnectedEdges([node], edges);

    // Generate a new unique ID for the duplicated node
    const newNodeId = `node_${Date.now()}`;

    // Create the new node with an offset position
    const newNode = {
      ...node,
      id: newNodeId,
      position: { x: node.position.x + 20, y: node.position.y + 20 }, // Offset the position slightly
      selected: false, // Ensure the new node is not selected by default
    };

    // Duplicate the edges connected to the node
    const newEdges = connectedEdges.map((edge) => {
      const newEdgeId = uuidv4();
      return {
        ...edge,
        id: newEdgeId,
        source: edge.source === id ? newNodeId : edge.source, // Update source if the current node is the source
        target: edge.target === id ? newNodeId : edge.target, // Update target if the current node is the target
      };
    });

    // Dispatch actions to add the new node and edges
    dispatch(addNode({ node: newNode }));
    dispatch(setEdges({ edges: [...edges, ...newEdges] }));
  };

  const isSelected = String(id) === String(selectedNodeId);

  const status = data.run ? 'completed' : '';

  const nodeRunStatus: TaskStatus = data.taskStatus;

  let borderColor = 'gray';

  switch (nodeRunStatus) {
    case 'PENDING':
      borderColor = 'yellow';
      break;
    case 'RUNNING':
      borderColor = 'blue';
      break;
    case 'COMPLETED':
      borderColor = '#4CAF50';
      break;
    case 'FAILED':
      borderColor = 'red';
      break;
    case 'CANCELLED':
      borderColor = 'gray';
      break;
    default:
      if (status === 'completed') {
        borderColor = '#4CAF50';
      }
  }

  const { backgroundColor, ...restStyle } = style || {};

  const cardStyle = React.useMemo(() => ({
    ...restStyle,
    borderColor,
    borderWidth: isSelected
      ? '3px'
      : status === 'completed'
        ? '2px'
        : isHovered
          ? '3px'
          : restStyle.borderWidth || '1px',
    borderStyle: 'solid',
    transition: 'border-color 0.1s, border-width 0.02s',
    pointerEvents: 'auto'
  }), [isSelected, status, isHovered, restStyle, borderColor]);

  const acronym = data.acronym || 'N/A';
  const color = data.color || '#ccc';

  const tagStyle = React.useMemo(() => ({
    ...staticStyles.baseTag,
    backgroundColor: color
  }), [color]);

  const handleTitleChange = (newTitle: string) => {
    const validTitle = convertToPythonVariableName(newTitle);
    if (validTitle && validTitle !== getNodeTitle(data)) {
      dispatch(updateNodeTitle({ nodeId: id, newTitle: validTitle }));
    }
  };

  const headerStyle = React.useMemo(() => ({
    position: 'relative' as const,
    paddingTop: '8px',
    paddingBottom: isCollapsed ? '0px' : '16px',
  }), [isCollapsed]);

  const titleStyle = React.useMemo(() => ({
    marginBottom: isCollapsed ? '4px' : '8px'
  }), [isCollapsed]);

  return (
    <div style={staticStyles.container} draggable={false}>
      {showTitleError && (
        <Alert
          className="absolute -top-16 left-0 right-0 z-50"
          color="danger"
          onClose={() => setShowTitleError(false)}
        >
          Title cannot contain whitespace. Use underscores instead.
        </Alert>
      )}
      {/* Container to hold the Handle and the content */}
      <div>
        {/* Hidden target handle covering the entire node */}
        <Handle
          type="target"
          position={Position.Left}
          id={`node-body-${id}`}
          style={staticStyles.targetHandle}
          isConnectable={true}
          isConnectableStart={false}
        />

        {/* Node content wrapped in drag handle */}
        <div className="react-flow__node-drag-handle" style={staticStyles.dragHandle}>
          <Card
            className={`base-node ${className || ''}`}
            style={cardStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isHoverable
            classNames={{
              base: "bg-background border-default-200"
            }}
          >
            {data && (
              <CardHeader style={headerStyle}>
                {editingTitle ? (
                  <Input
                    autoFocus
                    value={titleInputValue}
                    size="sm"
                    variant="faded"
                    radius="lg"
                    onChange={(e) => {
                      const validValue = convertToPythonVariableName(e.target.value);
                      setTitleInputValue(validValue);
                      handleTitleChange(validValue);
                    }}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingTitle(false);
                      }
                    }}
                    classNames={{
                      input: 'bg-default-100',
                      inputWrapper: 'shadow-none',
                    }}
                  />
                ) : (
                  <h3
                    className="text-lg font-semibold text-center cursor-pointer hover:text-primary"
                    style={titleStyle}
                    onClick={() => {
                      setTitleInputValue(getNodeTitle(data));
                      setEditingTitle(true);
                    }}
                  >
                    {getNodeTitle(data)}
                  </h3>
                )}

                <div style={staticStyles.controlsContainer}>
                  <Button
                    size="sm"
                    variant="flat"
                    style={staticStyles.collapseButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCollapsed(!isCollapsed);
                    }}
                  >
                    {isCollapsed ? '▼' : '▲'}
                  </Button>

                  <div style={tagStyle} className="node-acronym-tag">
                    {acronym}
                  </div>
                </div>
              </CardHeader>
            )}
            {!isCollapsed && <Divider />}

            <CardBody className="px-1">
              {children}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Controls */}
      {(showControls || isSelected) && (
        <Card
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          style={staticStyles.controlsCard}
          classNames={{
            base: "bg-background border-default-200"
          }}
        >
          <div className="flex flex-row gap-1">
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onPress={handlePartialRun}
              disabled={loading}
            >
              <Icon className="text-default-500" icon="solar:play-linear" width={22} />
            </Button>
            {!isInputNode && (
              <Button
                isIconOnly
                radius="full"
                variant="light"
                onPress={handleDelete}
              >
                <Icon className="text-default-500" icon="solar:trash-bin-trash-linear" width={22} />
              </Button>
            )}
            {/* Duplicate Button */}
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onPress={handleDuplicate}
            >
              <Icon className="text-default-500" icon="solar:copy-linear" width={22} />
            </Button>
            {/* View Output Button */}
            {handleOpenModal && (
              <Button
                isIconOnly
                radius="full"
                variant="light"
                onPress={handleOpenModal}
              >
                <Icon className="text-default-500" icon="solar:eye-linear" width={22} />
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BaseNode;
