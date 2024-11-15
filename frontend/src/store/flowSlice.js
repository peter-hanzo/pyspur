import { createSlice, createAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { createNode } from '../utils/nodeFactory';
import set from 'lodash/set';

const initialState = {
  nodeTypes: [],
  nodes: [],
  edges: [],
  workflowID: null,
  hoveredNode: null,
  selectedNode: null,
  sidebarWidth: 400,
  projectName: 'Untitled Project',
  workflowInputVariables: {},
};

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    initializeFlow: (state, action) => {
      const { workflowID, definition, name } = action.payload;
      state.workflowID = workflowID;
      state.projectName = name;
      state.nodeTypes = action.payload.nodeTypes;
      const { nodes, links } = definition;
      // Map nodes to the expected format
      let mappedNodes = nodes.map(node =>
        createNode(state.nodeTypes, node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { config: node.config })
      );

      state.nodes = mappedNodes;

      // Map links to the expected edge format
      state.edges = links.map(link => ({
        id: uuidv4(),
        key: uuidv4(),
        selected: link.selected || false,
        source: link.source_id,
        target: link.target_id,
        sourceHandle: link.source_output_key,
        targetHandle: link.target_input_key
      }));

      // Initialize workflow input variables
      state.workflowInputVariables = {};
      nodes.forEach(node => {
        if (node.node_type === 'InputNode' && node.config?.input_schema) {
          node.config.input_schema.forEach(field => {
            state.workflowInputVariables[field.field_name] = '';
          });
        }
      });
    },
    nodesChange: (state, action) => {
      const changes = action.payload.changes;
      state.nodes = applyNodeChanges(changes, state.nodes);
    },
    edgesChange: (state, action) => {
      const changes = action.payload.changes;
      state.edges = applyEdgeChanges(changes, state.edges);
    },
    connect: (state, action) => {
      state.edges = addEdge(action.payload.connection, state.edges);
    },
    addNode: (state, action) => {
      if (action.payload.node) {
        state.nodes = [...state.nodes, action.payload.node];
      }
    },
    setNodes: (state, action) => {
      state.nodes = action.payload.nodes;
    },
    setEdges: (state, action) => {
      state.edges = action.payload.edges;
    },
    updateNodeData: (state, action) => {
      const { id, data } = action.payload;
      console.log('updateNodeData', id, data);
      const nodeIndex = state.nodes.findIndex((node) => node.id === id);
      if (nodeIndex !== -1) {
        const node = state.nodes[nodeIndex];
        const updatedNode = {
          ...node,
          data: { ...node.data, ...data },
        };
        state.nodes[nodeIndex] = updatedNode;
      }
    },
    updateNodeDataPath: (state, action) => {
      const { id, path, value } = action.payload;
      const nodeIndex = state.nodes.findIndex((node) => node.id === id);
      if (nodeIndex !== -1) {
        const node = state.nodes[nodeIndex];
        const newData = { ...node.data };
        set(newData, path, value);
        const updatedNode = {
          ...node,
          data: newData,
        };
        state.nodes[nodeIndex] = updatedNode;
      }
    },
    setHoveredNode: (state, action) => {
      state.hoveredNode = action.payload.nodeId;
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload.nodeId;
    },
    deleteNode: (state, action) => {
      const nodeId = action.payload.nodeId;
      state.nodes = state.nodes.filter((node) => node.id !== nodeId);

      // Delete all edges associated with the node
      state.edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

      // Clear the selected node if it's the one being deleted
      if (state.selectedNode === nodeId) {
        state.selectedNode = null;
      }
    },
    deleteEdge: (state, action) => {
      const edgeId = action.payload.edgeId;
      state.edges = state.edges.filter((edge) => edge.id !== edgeId);
    },
    setSidebarWidth: (state, action) => {
      state.sidebarWidth = action.payload;
    },
    setProjectName: (state, action) => {
      state.projectName = action.payload;
    },



    setWorkflowInputVariable: (state, action) => {
      const { key, value } = action.payload;
      state.workflowInputVariables[key] = value;
    },

    deleteWorkflowInputVariable: (state, action) => {
      const { key } = action.payload;

      // Delete the workflow input variable
      delete state.workflowInputVariables[key];

      // Remove any edges that are connected to this variable as a source
      state.edges = state.edges.filter(edge => edge.sourceHandle !== key);
    },

    updateWorkflowInputVariableKey: (state, action) => {
      const { oldKey, newKey } = action.payload;
      if (oldKey !== newKey) {
        // Update the workflowInputVariables
        state.workflowInputVariables[newKey] = state.workflowInputVariables[oldKey];
        delete state.workflowInputVariables[oldKey];

        // Update any edges that use this key as sourceHandle
        state.edges = state.edges.map(edge => {
          if (edge.sourceHandle === oldKey) {
            return {
              ...edge,
              sourceHandle: newKey
            };
          }
          return edge;
        });
      }
    },

    resetFlow: (state, action) => {
      const { nodes, links } = action.payload.definition;
      console.log("action", action);

      // Map nodes to the expected format
      let mappedNodes = nodes.map(node =>
        createNode(node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { config: node.config })
      );

      state.nodes = mappedNodes;

      // Map links to the expected edge format
      state.edges = links.map(link => ({
        id: uuidv4(),
        key: uuidv4(),
        selected: link.selected || false,
        source: link.source_id,
        target: link.target_id,
        sourceHandle: link.source_output_key,
        targetHandle: link.target_input_key
      }));
    },

    updateEdgesOnHandleRename: (state, action) => {
      const { nodeId, oldHandleId, newHandleId, schemaType } = action.payload;

      state.edges = state.edges.map((edge) => {
        if (schemaType === 'input_schema') {
          // For input handles, update edges where this node is the target
          if (edge.target === nodeId && edge.targetHandle === oldHandleId) {
            return {
              ...edge,
              targetHandle: newHandleId,
            };
          }
        } else if (schemaType === 'output_schema') {
          // For output handles, update edges where this node is the source
          if (edge.source === nodeId && edge.sourceHandle === oldHandleId) {
            return {
              ...edge,
              sourceHandle: newHandleId,
            };
          }
        }
        return edge;
      });
    },
  },
});

export const {
  initializeFlow,
  nodesChange,
  edgesChange,
  connect,
  addNode,
  setNodes,
  setEdges,
  updateNodeData,
  updateNodeDataPath,
  setHoveredNode,
  setSelectedNode,
  deleteNode,
  deleteEdge,
  setSidebarWidth,
  setProjectName,
  setWorkflowInputVariable,
  deleteWorkflowInputVariable,
  updateWorkflowInputVariableKey,
  resetFlow,
  updateEdgesOnHandleRename
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state, nodeId) => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};