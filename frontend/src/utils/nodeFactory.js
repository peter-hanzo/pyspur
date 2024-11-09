import { nodeTypes } from '../constants/nodeTypes';
import DynamicModel from './DynamicModel';

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
  console.log('nodeType', nodeType);
  if (!nodeType) {
    return null;
  }

  const userConfigData = {
    schema: nodeType.config?.schema || {},
    input_schema: nodeType.input?.properties || {},
    output_schema: nodeType.output?.properties || {},
    title: nodeType.name,
  };

  const node = {
    id,
    type: nodeType.name,
    position,
    data: {
      title: nodeType.name,
      acronym: nodeType.visual_tag.acronym,
      color: nodeType.visual_tag.color,
      config: nodeType.config,
      input: nodeType.input,
      output: nodeType.output,
      userconfig: userConfigData,
      ...additionalData,
    },
  };
  console.log('newNode', node);
  return node;
};
