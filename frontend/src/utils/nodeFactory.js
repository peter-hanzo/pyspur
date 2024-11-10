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
    input_schema: cloneDeep(nodeType.input?.properties) || {},
    output_schema: cloneDeep(nodeType.output?.properties) || {},
    title: nodeType.name,
  };

  let processedAdditionalData = cloneDeep(additionalData);

  // If the additional data has a userconfig field, merge it with the default userconfig
  if (additionalData.userconfig) {
    processedAdditionalData.userconfig = {
      ...userConfigData,
      ...additionalData.userconfig,
    };
  }

  // if input_schema and output_schema are objects like foo: { type: 'string', title: 'Foo' } then convert them to foo: 'string'
  // but if they are already foo: 'string' then leave them as is
  if (processedAdditionalData.userconfig?.input_schema) {
    processedAdditionalData.userconfig.input_schema = Object.fromEntries(
      Object.entries(processedAdditionalData.userconfig.input_schema).map(([key, value]) => {
        return [key, typeof value === 'object' ? value.type : value];
      })
    );
  }
  if (processedAdditionalData.userconfig?.output_schema) {
    processedAdditionalData.userconfig.output_schema = Object.fromEntries(
      Object.entries(processedAdditionalData.userconfig.output_schema).map(([key, value]) => {
        return [key, typeof value === 'object' ? value.type : value];
      })
    );
  }

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
      ...processedAdditionalData,
    },
  };
  return node;
};
