import { ReactFlowInstance } from '@xyflow/react';
import { addNode, connect, deleteEdge } from '../../store/flowSlice';
import { createNode } from '../../utils/nodeFactory';
import { AppDispatch } from '../../store/store';

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

interface Node {
  id: string;
  position: Position;
  data?: NodeData;
}

export const addNodeWithoutConnection = (
  nodeTypes: Record<string, any>,
  nodeType: string,
  reactFlowInstance: ReactFlowInstance,
  dispatch: AppDispatch
): void => {
  const id = `node_${Date.now()}`;
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

export const addNodeBetweenNodes = (
  nodeTypes: Record<string, any>,
  nodeType: string,
  sourceNode: Node,
  targetNode: Node,
  edgeId: string,
  reactFlowInstance: ReactFlowInstance,
  dispatch: AppDispatch,
  setVisible: (visible: boolean) => void
): void => {
  if (!sourceNode?.position || !targetNode?.position) {
    console.error('Invalid source or target node position');
    return;
  }

  const id = `node_${Date.now()}`;
  const newPosition = {
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  };

  // Create the new node
  const newNode = createNode(nodeTypes, nodeType, id, newPosition);

  // Special handling for input node as source
  const getSourceOutputKey = (node: Node): string => {
    if (node.id === 'input_node') {
      // For input node, use the first key from input_schema as the output key
      return Object.keys(node.data?.config?.input_schema || {})[0] || 'output';
    }
    return Object.keys(node.data?.config?.output_schema || {})[0] || 'output';
  };

  // Get schema keys
  const sourceOutputKey = getSourceOutputKey(sourceNode);
  const targetInputKey = Object.keys(targetNode.data?.config?.input_schema || {})[0] || 'input';
  const newNodeInputKey = Object.keys(newNode.data?.config?.input_schema || {})[0] || 'input';
  const newNodeOutputKey = Object.keys(newNode.data?.config?.output_schema || {})[0] || 'output';

  // First delete the existing edge
  dispatch(deleteEdge({ edgeId }));

  // Then add the new node
  dispatch(addNode({ node: newNode }));

  // Create source -> new node connection
  dispatch(connect({
    connection: {
      id: `edge-${sourceNode.id}-${id}`,
      source: sourceNode.id,
      sourceHandle: sourceOutputKey,
      target: id,
      targetHandle: newNodeInputKey,
      data: {
        source_output_key: sourceOutputKey,
        target_input_key: newNodeInputKey,
        source_output_type: sourceNode.id === 'input_node'
          ? (sourceNode.data?.config?.input_schema?.[sourceOutputKey] || 'str')
          : (sourceNode.data?.config?.output_schema?.[sourceOutputKey] || 'str'),
        target_input_type: newNode.data?.config?.input_schema?.[newNodeInputKey] || 'str'
      }
    }
  }));

  // Create new node -> target connection
  dispatch(connect({
    connection: {
      id: `edge-${id}-${targetNode.id}`,
      source: id,
      sourceHandle: newNodeOutputKey,
      target: targetNode.id,
      targetHandle: targetInputKey,
      data: {
        source_output_key: newNodeOutputKey,
        target_input_key: targetInputKey,
        source_output_type: newNode.data?.config?.output_schema?.[newNodeOutputKey] || 'str',
        target_input_type: targetNode.data?.config?.input_schema?.[targetInputKey] || 'str'
      }
    }
  }));

  setVisible(false);
};