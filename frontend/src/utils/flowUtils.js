import { v4 as uuidv4 } from 'uuid';
import { createNode } from './nodeFactory';

// Utility function to map nodes and edges
export const mapNodesAndEdges = (definition) => {
  const { nodes, links } = definition;

  // Map nodes to the expected format
  const mappedNodes = nodes.map(node =>
    createNode(node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y })
  );

  // Map links to the expected edge format
  const mappedEdges = links.map(link => ({
    id: uuidv4(),
    key: uuidv4(),
    selected: link.selected || false,
    source: link.source_id,
    target: link.target_id,
    sourceHandle: link.source_output_key,
    targetHandle: link.target_input_key
  }));

  return { nodes: mappedNodes, edges: mappedEdges };
};

// Utility function to handle schema changes
export const handleSchemaChanges = (node, data, edges) => {
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