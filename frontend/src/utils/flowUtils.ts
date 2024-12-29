import { v4 as uuidv4 } from 'uuid';
import { createNode } from './nodeFactory';
import { ReactFlowInstance } from '@xyflow/react';
import { AppDispatch } from '../store/store';
import { addNode, connect, deleteEdge } from '../store/flowSlice';
import isEqual from 'lodash/isEqual';
import { FlowWorkflowNode } from '../store/flowSlice';

export const getNodeTitle = (data: FlowWorkflowNode['data']): string => {
  return data?.config?.title || data?.title || data?.type || 'Untitled';
};

interface Position {
  x: number;
  y: number;
}

interface NodeData {
  config?: {
    input_schema?: Record<string, string>;
    output_schema?: Record<string, string>;
  };
}

interface FlowNode {
  id: string;
  position: Position;
  data?: NodeData;
}

const generateNewNodeId = (
  nodes: FlowNode[],
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
  nodes: FlowNode[],
  nodeTypes: Record<string, any>,
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

  const newNode = createNode(nodeTypes, nodeType, id, position);
  dispatch(addNode({ node: newNode }));
};

export const insertNodeBetweenNodes = (
  nodes: FlowNode[],
  nodeTypes: Record<string, any>,
  nodeType: string,
  sourceNode: FlowNode,
  targetNode: FlowNode,
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
  const newNode = createNode(nodeTypes, nodeType, id, newPosition);

  // First delete the existing edge
  dispatch(deleteEdge({ edgeId }));

  // Then add the new node
  dispatch(addNode({ node: newNode }));

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