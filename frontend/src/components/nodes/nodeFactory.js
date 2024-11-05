import { nodeTypes } from '../../constants/nodeTypes';
import DynamicModel from '../../utils/DynamicModel';

// Function to create a node based on its type
export const createNode = (type, id, position, additionalData = {}) => {
  let nodeType = null;
  for (const category in nodeTypes) {
    const found = nodeTypes[category].find(node => node.name === type);
    if (found) {
      nodeType = found;
      break;
    }
  }

  if (!nodeType) {
    return null;
  }

  const userConfigData = {
    schema: nodeType.config?.schema || {},
    input_schema: nodeType.input?.properties || {},
    output_schema: nodeType.output?.properties || {},
    title: nodeType.name,
  };

  return {
    id,
    type: nodeType.name,
    position,
    data: {
      ...additionalData,
      title: nodeType.name,
      acronym: nodeType.acronym,
      color: nodeType.color,
      config: nodeType.config,
      input: nodeType.input,
      output: nodeType.output,
      userconfig: userConfigData,
    },
  };
};
