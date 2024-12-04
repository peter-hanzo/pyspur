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

interface Node {
  id: string;
  type: string;
  position: Position;
  data: {
    title: string;
    acronym: string;
    color: string;
    config: Record<string, any>;
    input: {
      properties: Record<string, any>;
      [key: string]: any;
    };
    output: {
      properties: Record<string, any>;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Function to create a node based on its type
export const createNode = (
  nodeTypes: NodeTypes,
  type: string,
  id: string,
  position: Position,
  additionalData: AdditionalData = {}
): Node | null => {
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

  const inputProperties = cloneDeep(nodeType.input?.properties) || {};
  const outputProperties = cloneDeep(nodeType.output?.properties) || {};

  let processedAdditionalData = cloneDeep(additionalData);

  // If the additional data has input/output properties, merge them with the default properties
  if (additionalData.input?.properties) {
    processedAdditionalData.input = {
      ...processedAdditionalData.input,
      properties: {
        ...inputProperties,
        ...additionalData.input.properties,
      },
    };
  }

  if (additionalData.output?.properties) {
    processedAdditionalData.output = {
      ...processedAdditionalData.output,
      properties: {
        ...outputProperties,
        ...additionalData.output.properties,
      },
    };
  }

  const node: Node = {
    id,
    type: nodeType.name,
    position,
    data: {
      title: nodeType.name,
      acronym: nodeType.visual_tag.acronym,
      color: nodeType.visual_tag.color,
      config: cloneDeep(nodeType.config),
      input: {
        properties: inputProperties,
        ...processedAdditionalData.input,
      },
      output: {
        properties: outputProperties,
        ...processedAdditionalData.output,
      },
      ...processedAdditionalData,
    },
  };
  return node;
};