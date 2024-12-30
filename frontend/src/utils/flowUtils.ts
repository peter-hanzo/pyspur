import { createNode } from './nodeFactory';
import { ReactFlowInstance, NodeTypes, Node, Edge, NodeChange, EdgeChange, Connection, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import { AppDispatch } from '../store/store';
import { addNode, connect, deleteEdge, nodesChange, edgesChange, addNodeWithConfig } from '../store/flowSlice';
import isEqual from 'lodash/isEqual';
import { FlowWorkflowNode } from '../store/flowSlice';
import { useMemo, useCallback } from 'react';
import DynamicNode from '../components/nodes/DynamicNode';
import InputNode from '../components/nodes/InputNode';
import { RouterNode } from '../components/nodes/logic/RouterNode';
import { CoalesceNode } from '../components/nodes/logic/CoalesceNode';
import React from 'react';

interface NodeTypesConfig {
  [category: string]: Array<{
    name: string;
    config?: {
      title?: string;
    };
    [key: string]: any;
  }>;
}

interface UseNodeTypesOptions {
  nodeTypesConfig: NodeTypesConfig | undefined;
  readOnly?: boolean;
  includeCoalesceNode?: boolean;
}

export const useNodeTypes = ({ nodeTypesConfig, readOnly = false, includeCoalesceNode = false }: UseNodeTypesOptions) => {
  const nodeTypes = useMemo<NodeTypes>(() => {
    if (!nodeTypesConfig) return {};

    const types: NodeTypes = {};
    Object.keys(nodeTypesConfig).forEach(category => {
      nodeTypesConfig[category].forEach(node => {
        if (node.name === 'InputNode') {
          types[node.name] = (props: any) => React.createElement(InputNode, { ...props, readOnly });
        } else if (node.name === 'RouterNode') {
          types[node.name] = (props: any) => React.createElement(RouterNode, { ...props, readOnly });
        } else if (includeCoalesceNode && node.name === 'CoalesceNode') {
          types[node.name] = CoalesceNode;
        } else {
          types[node.name] = (props: any) => React.createElement(DynamicNode, { ...props, type: node.name, displayOutput: true, readOnly });
        }
      });
    });
    return types;
  }, [nodeTypesConfig, readOnly, includeCoalesceNode]);

  const isLoading = !nodeTypesConfig;
  return { nodeTypes, isLoading };
};

export const getNodeTitle = (data: FlowWorkflowNode['data']): string => {
  return data?.config?.title || data?.title || data?.type || 'Untitled';
};


const generateNewNodeId = (
  nodes: FlowWorkflowNode[],
  nodeType: string
): string => {
  const existingIds = nodes.map((node) => node.id);
  const sanitizedType = nodeType.replace(/\s+/g, '_');
  let counter = 1;
  let newId = `${sanitizedType}_${counter}`;

  while (existingIds.includes(newId)) {
    counter++;
    newId = `${sanitizedType}_${counter}`;
  }

  return newId;
};

export const createNodeAtCenter = (
  nodes: FlowWorkflowNode[],
  nodeTypes: NodeTypes,
  nodeType: string,
  reactFlowInstance: ReactFlowInstance,
  dispatch: AppDispatch
): void => {
  const id = generateNewNodeId(nodes, nodeType);
  const center = reactFlowInstance.screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const position = {
    x: center.x,
    y: center.y,
  };

  const result = createNode(nodeTypes, nodeType, id, position);
  if (result) {
    dispatch(addNodeWithConfig(result));
  }
};

export const insertNodeBetweenNodes = (
  nodes: FlowWorkflowNode[],
  nodeTypes: NodeTypes,
  nodeType: string,
  sourceNode: FlowWorkflowNode,
  targetNode: FlowWorkflowNode,
  edgeId: string,
  reactFlowInstance: ReactFlowInstance,
  dispatch: AppDispatch,
  onComplete?: () => void
): void => {
  if (!sourceNode?.position || !targetNode?.position) {
    console.error('Invalid source or target node position');
    return;
  }

  const id = generateNewNodeId(nodes, nodeType);
  const newPosition = {
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  };

  // Create the new node
  const result = createNode(nodeTypes, nodeType, id, newPosition);
  if (!result) {
    console.error('Failed to create node');
    return;
  }

  // First delete the existing edge
  dispatch(deleteEdge({ edgeId }));

  // Then add the new node with its config
  dispatch(addNodeWithConfig(result));

  // Create source -> new node connection
  dispatch(connect({
    connection: {
      source: sourceNode.id,
      target: id,
      sourceHandle: sourceNode.id,
      targetHandle: sourceNode.id,
    }
  }));

  // Create new node -> target connection
  dispatch(connect({
    connection: {
      source: id,
      target: targetNode.id,
      sourceHandle: id,
      targetHandle: id,
    }
  }));

  onComplete?.();
};

export const nodeComparator = (prevNode: FlowWorkflowNode, nextNode: FlowWorkflowNode) => {
  if (!prevNode || !nextNode) return false;
  // Skip position and measured properties when comparing nodes
  const { position: prevPosition, measured: prevMeasured, ...prevRest } = prevNode;
  const { position: nextPosition, measured: nextMeasured, ...nextRest } = nextNode;
  return isEqual(prevRest, nextRest);
};

// New centralized functions

interface StyledEdgesOptions {
  edges: Edge[];
  hoveredNode: string | null;
  hoveredEdge: string | null;
  handlePopoverOpen?: (params: { sourceNode: Node; targetNode: Node; edgeId: string }) => void;
  readOnly?: boolean;
}

export const useStyledEdges = ({ edges, hoveredNode, hoveredEdge, handlePopoverOpen, readOnly = false }: StyledEdgesOptions) => {
  return useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'custom',
      style: {
        stroke: readOnly
          ? (edge.id === hoveredEdge
            ? 'black'
            : edge.source === hoveredNode || edge.target === hoveredNode
              ? 'black'
              : '#555')
          : (hoveredEdge === edge.id ||
            hoveredNode === edge.source ||
            hoveredNode === edge.target
            ? '#555'
            : '#999'),
        strokeWidth: readOnly
          ? (edge.id === hoveredEdge
            ? 4
            : edge.source === hoveredNode || edge.target === hoveredNode
              ? 4
              : 2)
          : (hoveredEdge === edge.id ||
            hoveredNode === edge.source ||
            hoveredNode === edge.target
            ? 3
            : 1.5),
      },
      data: {
        ...edge.data,
        showPlusButton: edge.id === hoveredEdge,
        onPopoverOpen: handlePopoverOpen,
      },
      key: edge.id,
    }));
  }, [edges, hoveredNode, hoveredEdge, handlePopoverOpen, readOnly]);
};

interface NodesWithModeOptions {
  nodes: Node[];
  mode: 'pointer' | 'hand';
}

export const useNodesWithMode = ({ nodes, mode }: NodesWithModeOptions) => {
  return useMemo(() => {
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
};

interface FlowEventHandlersOptions {
  dispatch: AppDispatch;
  nodes: Node[];
  setHelperLines?: (lines: { horizontal: number | null; vertical: number | null }) => void;
}

export const useFlowEventHandlers = ({ dispatch, nodes, setHelperLines }: FlowEventHandlersOptions) => {
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!changes.some((c) => c.type === 'position')) {
        setHelperLines?.({ horizontal: null, vertical: null });
        dispatch(nodesChange({ changes }));
        return;
      }
      dispatch(nodesChange({ changes }));
    },
    [dispatch, nodes, setHelperLines]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => dispatch(edgesChange({ changes })),
    [dispatch]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.targetHandle || connection.targetHandle === 'node-body') {
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (sourceNode && targetNode) {
          const outputHandleName = connection.sourceHandle;

          if (!outputHandleName) {
            console.error('Source handle is not specified.');
            return;
          }

          connection = {
            ...connection,
            targetHandle: outputHandleName,
          };
        }
      }

      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (sourceNode?.type === 'RouterNode') {
        connection = {
          ...connection,
          targetHandle: connection.source + '.' + connection.sourceHandle,
        };
      } else {
        connection = {
          ...connection,
          targetHandle: connection.sourceHandle,
        };
      }

      dispatch(connect({ connection }));
    },
    [dispatch, nodes]
  );

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
};