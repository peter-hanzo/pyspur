import { nodeTypes } from '../../constants/nodeTypes';
import DynamicModel from '../../utils/DynamicModel';

// Function to create a node based on its type
export const createNode = (type, id, position, additionalData = {}) => {
  // Find the node type definition from nodeTypes.js
  const nodeType = Object.values(nodeTypes).flat().find(node => node.name === type);

  if (!nodeType) {
    throw new Error(`Node type ${type} not found in nodeTypes.js`);
  }

  const dynamicModel = new DynamicModel(nodeType.config);
  console.log('dynamicModel', dynamicModel);


  // Create the node data, including acronym and color
  const nodeData = {
    ...additionalData,
    title: nodeType.name,
    acronym: nodeType.acronym,
    color: nodeType.color,
    config: nodeType.config,
    input: nodeType.input,
    output: nodeType.output,
    userconfig: {...dynamicModel},
  };

  return {
    id,
    type,
    data: nodeData,
    position,
  };
};
