import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ReactFlow, Background, ReactFlowProvider, useViewport, Node, Edge, Connection, NodeChange, EdgeChange, OnNodesChange, OnEdgesChange, OnConnect, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSelector, useDispatch } from 'react-redux';
import Operator from './footer/operator/Operator';
import {
  nodesChange,
  edgesChange,
  connect,
  setSelectedNode,
  deleteNode,
  setWorkflowInputVariable,
  updateNodeData,
  setNodes,
} from '../../store/flowSlice';
import NodeSidebar from '../nodes/nodeSidebar/NodeSidebar';
import { Dropdown, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';
import DynamicNode from '../nodes/DynamicNode';
import { v4 as uuidv4 } from 'uuid';
import { addNodeBetweenNodes } from './AddNodePopoverCanvas';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CustomEdge from './edges/CustomEdge';
import { getHelperLines } from '../../utils/helperLines';
import HelperLinesRenderer from '../HelperLines';
import useCopyPaste from '../../utils/useCopyPaste';
import { useModeStore } from '../../store/modeStore';
import { initializeFlow } from '../../store/flowSlice';
import InputNode from '../nodes/InputNode';
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow';
import LoadingSpinner from '../LoadingSpinner';
import ConditionalNode from '../nodes/ConditionalNode';
import dagre from '@dagrejs/dagre';
import { AppDispatch, RootState } from '../../store/store';

interface WorkflowData {
  definition: {
    nodes: Array<{
      node_type: string;
      config: {
        input_schema?: Record<string, string>;
      };
    }>;
  };
}

interface FlowCanvasProps {
  workflowData?: WorkflowData;
  workflowID?: string;
}

interface NodeTypesConfig {
  [category: string]: Array<{
    name: string;
    [key: string]: any;
  }>;
}

interface PopoverPosition {
  x: number;
  y: number;
}

interface SelectedEdge {
  sourceNode: Node;
  targetNode: Node;
  edgeId: string;
}

const useNodeTypes = ({ nodeTypesConfig }: { nodeTypesConfig: NodeTypesConfig | null }) => {
  const nodeTypes = useMemo(() => {
    if (!nodeTypesConfig) return {};
    return Object.keys(nodeTypesConfig).reduce((acc: Record<string, React.ComponentType<any>>, category) => {
      nodeTypesConfig[category].forEach(node => {
        if (node.name === 'InputNode') {
          acc[node.name] = InputNode;
        } else if (node.name === 'ConditionalNode') {
          acc[node.name] = ConditionalNode;
        } else {
          acc[node.name] = (props: any) => {
            return <DynamicNode {...props} type={node.name} />;
          };
        }
      });
      return acc;
    }, {});
  }, [nodeTypesConfig]);

  const isLoading = !nodeTypesConfig;
  return { nodeTypes, isLoading };
};

const edgeTypes = {
  custom: CustomEdge,
};

const FlowCanvasContent: React.FC<FlowCanvasProps> = ({ workflowData, workflowID }) => {
  const dispatch = useDispatch<AppDispatch>();
  const nodeTypesConfig = useSelector((state: RootState) => state.nodeTypes.data);

  useEffect(() => {
    if (workflowData) {
      console.log('workflowData', workflowData);
      if (workflowData.definition.nodes) {
        const inputNode = workflowData.definition.nodes.filter(node => node.node_type === 'InputNode');
        if (inputNode.length > 0) {
          const inputSchema = inputNode[0].config.input_schema;
          if (inputSchema) {
            const workflowInputVariables = Object.entries(inputSchema).map(([key, type]) => {
              return { key, value: '' };
            });
            workflowInputVariables.forEach(variable => {
              dispatch(setWorkflowInputVariable(variable));
            });
          }
        }
      }
      dispatch(initializeFlow({ nodeTypes: nodeTypesConfig, ...workflowData, workflowID }));
    }
  }, [dispatch, workflowData, workflowID, nodeTypesConfig]);

  const { nodeTypes, isLoading } = useNodeTypes({ nodeTypesConfig });

  const nodes = useSelector((state: RootState) => state.flow.nodes);
  const edges = useSelector((state: RootState) => state.flow.edges);
  const selectedNodeID = useSelector((state: RootState) => state.flow.selectedNode);

  const saveWorkflow = useSaveWorkflow([nodes, edges], 10000);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [helperLines, setHelperLines] = useState<{ horizontal: number | null; vertical: number | null }>({ horizontal: null, vertical: null });
  const showHelperLines = false;

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [isPopoverContentVisible, setPopoverContentVisible] = useState<boolean>(false);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ x: 0, y: 0 });

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (!changes.some((c) => c.type === 'position')) {
        setHelperLines({ horizontal: null, vertical: null });
        dispatch(nodesChange({ changes }));
        return;
      }

      const positionChange = changes.find(
        (c) => c.type === 'position' && 'position' in c && c.position
      );

      if (positionChange && showHelperLines && 'position' in positionChange) {
        const { horizontal, vertical } = getHelperLines(positionChange, nodes);
        setHelperLines({ horizontal, vertical });

        if (horizontal || vertical) {
          const snapPosition = {
            x: positionChange.position.x,
            y: positionChange.position.y
          };
          if (horizontal) snapPosition.y = horizontal;
          if (vertical) snapPosition.x = vertical;
          positionChange.position = snapPosition;
        }
      }

      dispatch(nodesChange({ changes }));
    },
    [dispatch, nodes, showHelperLines]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => dispatch(edgesChange({ changes })),
    [dispatch]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.targetHandle || connection.targetHandle === 'node-body') {
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (sourceNode && targetNode) {
          const outputHandleName = connection.sourceHandle;

          if (!outputHandleName) {
            console.error('Source handle is not specified.');
            return;
          }

          const updatedInputSchema = {
            ...targetNode.data.config.input_schema,
            [outputHandleName]: 'str',
          };

          dispatch(
            updateNodeData({
              id: targetNode.id,
              data: {
                config: {
                  ...targetNode.data.config,
                  input_schema: updatedInputSchema,
                },
              },
            })
          );

          connection = {
            ...connection,
            targetHandle: outputHandleName,
          };
        }
      }

      const newEdge = {
        ...connection,
        id: uuidv4(),
        key: uuidv4(),
      };
      dispatch(connect({ connection: newEdge }));
    },
    [dispatch, nodes]
  );

  // ... Rest of your component implementation ...
  // Add proper type annotations for the remaining functions and state

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* ... Rest of your JSX ... */}
    </div>
  );
};

const FlowCanvas: React.FC<FlowCanvasProps> = ({ workflowData, workflowID }) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasContent workflowData={workflowData} workflowID={workflowID} />
    </ReactFlowProvider>
  );
};

export default FlowCanvas;