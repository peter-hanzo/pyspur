import { v4 as uuidv4 } from 'uuid';
import { createNode } from './nodeFactory';
import { ReactFlowInstance } from '@xyflow/react';
import { AppDispatch } from '../store/store';
import { addNodeWithConfig, connect, deleteEdge } from '../store/flowSlice';
import {
  NodeDefinition,
  LinkDefinition,
  Definition,
  NodeTypes,
  MappedNode,
  MappedEdge,
  Position,
  NodeData,
  BaseNode,
  FlowWorkflowNode,
  CreateNodeResult,
  FlowWorkflowNodeConfig
} from '../store/flowSlice';

export const mapNodesAndEdges = (
  definition: Definition,
  nodeTypes: NodeTypes
): { nodes: MappedNode[]; edges: MappedEdge[]; configs: Record<string, FlowWorkflowNodeConfig> } => {
  const { nodes, links } = definition;
  console.log('nodes', nodes);

  const configs: Record<string, FlowWorkflowNodeConfig> = {};

  // Map nodes to the expected format
  const mappedNodes: MappedNode[] = nodes.map((node) => {
    const result = createNode(
      nodeTypes,
      node.node_type,
      node.id,
      { x: node.coordinates.x, y: node.coordinates.y },
      node.additionalData || {}
    );
    if (result) {
      configs[node.id] = result.config;
      return result.node as MappedNode;
    }
    return undefined;
  }).filter((node): node is MappedNode => node !== undefined);

  // Map links to the expected edge format
  const mappedEdges: MappedEdge[] = links.map((link) => ({
    id: uuidv4(),
    key: uuidv4(),
    selected: link.selected || false,
    source: link.source_id,
    target: link.target_id,
    sourceHandle: link.source_output_key,
    targetHandle: link.target_input_key,
  }));

  return { nodes: mappedNodes, edges: mappedEdges, configs };
};

// Define types for handleSchemaChanges
interface Node {
  config?: {
    input_schema?: Record<string, any>;
    output_schema?: Record<string, any>;
  };
}

interface Data {
  config?: {
    input_schema?: Record<string, any>;
    output_schema?: Record<string, any>;
  };
}

export const handleSchemaChanges = (
  node: Node,
  data: Data,
  edges: MappedEdge[]
): MappedEdge[] => {
  const oldConfig = node.config || {};
  const newConfig = data.config || {};

  const oldInputKeys = Object.keys(oldConfig.input_schema || {});
  const newInputKeys = Object.keys(newConfig.input_schema || {});

  const oldOutputKeys = Object.keys(oldConfig.output_schema || {});
  const newOutputKeys = Object.keys(newConfig.output_schema || {});

  // Handle input schema changes
  oldInputKeys.forEach((oldKey) => {
    if (!newInputKeys.includes(oldKey)) {
      edges = edges.map((edge) => {
        if (edge.sourceHandle === oldKey) {
          return { ...edge, sourceHandle: null };
        }
        if (edge.targetHandle === oldKey) {
          return { ...edge, targetHandle: null };
        }
        return edge;
      });
    }
  });

  // Handle output schema changes
  oldOutputKeys.forEach((oldKey) => {
    if (!newOutputKeys.includes(oldKey)) {
      edges = edges.map((edge) => {
        if (edge.sourceHandle === oldKey) {
          return { ...edge, sourceHandle: null };
        }
        if (edge.targetHandle === oldKey) {
          return { ...edge, targetHandle: null };
        }
        return edge;
      });
    }
  });

  return edges;
};

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