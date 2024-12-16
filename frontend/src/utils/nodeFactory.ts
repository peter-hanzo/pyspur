import { FlowWorkflowNode } from '@/store/flowSlice';
import cloneDeep from 'lodash/cloneDeep';

// Define types for the node structure
interface NodeType {
  name: string;
  visual_tag: {
    acronym: string;
    color: string;
  };
  config: Record<string, any>;
  input?: {
    properties: Record<string, any>;
  };
  output?: {
    properties: Record<string, any>;
  };
}

interface NodeTypes {
  [category: string]: NodeType[];
}

interface Position {
  x: number;
  y: number;
}

interface AdditionalData {
  input?: {
    properties?: Record<string, any>;
  };
  output?: {
    properties?: Record<string, any>;
  };
  [key: string]: any;
}


// Function to create a node based on its type
export const createNode = (
  nodeTypes: NodeTypes,
  type: string,
  id: string,
  position: Position,
  additionalData: AdditionalData = {}
): FlowWorkflowNode | null => {
  let nodeType: NodeType | null = null;

  for (const category in nodeTypes) {
    const found = nodeTypes[category].find((node) => node.name === type);
    if (found) {
      nodeType = found;
      break;
    }
  }
  if (!nodeType) {
    return null;
  }

  let processedAdditionalData = cloneDeep(additionalData);
  let config = cloneDeep(nodeType.config);
  config = {
    ...config,
    title: id,
  };

  const node: FlowWorkflowNode = {
    id,
    type: nodeType.name,
    position,
    data: {
      title: id,
      acronym: nodeType.visual_tag.acronym,
      color: nodeType.visual_tag.color,
      config: config,
      ...processedAdditionalData,
    },
  };
  return node;
};