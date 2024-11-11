import { createSlice, createAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { createNode } from '../utils/nodeFactory';


const initialState = {
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
      const { workflowID, definition, nodeTypes, name } = action.payload;
      console.log("action", action);
      state.workflowID = workflowID;
      state.projectName = name;
      const { nodes, links } = definition;
      // Map nodes to the expected format
      let mappedNodes = nodes.map(node =>
        createNode(nodeTypes, node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { userconfig: node.config })
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

      // Ensure workflowInputVariables are not reset unless explicitly provided
      if (definition.input_variables) {
        state.workflowInputVariables = definition.input_variables;
      }
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
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        const oldData = node.data;
        node.data = { ...node.data, ...data };

        // Check if the node is not an InputNode
        if (node.type !== 'InputNode') {
          // Check if any key names have changed in the node's data
          const oldKeys = Object.keys(oldData.userconfig || {});
          const newKeys = Object.keys(data.userconfig || {});

          oldKeys.forEach((oldKey) => {
            if (!newKeys.includes(oldKey)) {
              // Key was removed, update edges
              state.edges = state.edges.map((edge) => {
                if (edge.sourceHandle === oldKey) {
                  return { ...edge, sourceHandle: null }; // Remove the sourceHandle if the key was removed
                }
                if (edge.targetHandle === oldKey) {
                  return { ...edge, targetHandle: null }; // Remove the targetHandle if the key was removed
                }
                return edge;
              });
            }
          });

          newKeys.forEach((newKey) => {
            const oldKey = oldKeys.find((key) => key !== newKey);
            if (oldKey) {
              // Key was renamed, update edges
              state.edges = state.edges.map((edge) => {
                if (edge.sourceHandle === oldKey) {
                  return { ...edge, sourceHandle: newKey }; // Update the sourceHandle with the new key
                }
                if (edge.targetHandle === oldKey) {
                  return { ...edge, targetHandle: newKey }; // Update the targetHandle with the new key
                }
                return edge;
              });
            }
          });
        }
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
        createNode(node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { userconfig: node.config })
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
  setHoveredNode,
  setSelectedNode,
  deleteNode,
  deleteEdge,
  setSidebarWidth,
  setProjectName,
  setWorkflowInputVariable,
  deleteWorkflowInputVariable,
  updateWorkflowInputVariableKey,
  resetFlow
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state, nodeId) => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};
