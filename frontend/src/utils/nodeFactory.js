import { nodeTypes } from '../constants/nodeTypes';
import cloneDeep from 'lodash/cloneDeep';

// Function to create a node based on its type
export const createNode = (type, id, position, additionalData = {}) => {
  let nodeType = null;
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

  const userConfigData = {
    schema: cloneDeep(nodeType.config?.schema) || {},
    input_schema: cloneDeep(nodeType.input?.properties) || {},
    output_schema: cloneDeep(nodeType.output?.properties) || {},
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
      config: cloneDeep(nodeType.config),
      input: cloneDeep(nodeType.input),
      output: cloneDeep(nodeType.output),
      userconfig: userConfigData,
      ...additionalData,
    },
  };
  return node;
};
