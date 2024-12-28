import { v4 as uuidv4 } from 'uuid';
import { createNode } from './nodeFactory';
import { ReactFlowInstance } from '@xyflow/react';
import { AppDispatch } from '../store/store';
import { addNodeWithConfig, connect, deleteEdge } from '../store/flowSlice';
import {
  NodeTypes,
  BaseNode,
} from '../store/flowSlice';


const generateNewNodeId = (
  nodes: BaseNode[],
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
  nodes: BaseNode[],
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
  nodes: BaseNode[],
  nodeTypes: NodeTypes,
  nodeType: string,
  sourceNode: BaseNode,
  targetNode: BaseNode,
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