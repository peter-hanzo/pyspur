import { createSlice } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { mapNodesAndEdges, handleSchemaChanges } from '../utils/flowUtils';

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
      const { workflowID, definition, name } = action.payload;
      state.workflowID = workflowID;
      state.projectName = name;

      const { nodes, edges } = mapNodesAndEdges(definition);
      state.nodes = nodes;
      state.edges = edges;

      if (definition.input_variables) {
        state.workflowInputVariables = definition.input_variables;
      }
    },
    nodesChange: (state, action) => {
      state.nodes = applyNodeChanges(action.payload.changes, state.nodes);
    },
    edgesChange: (state, action) => {
      state.edges = applyEdgeChanges(action.payload.changes, state.edges);
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
        state.edges = handleSchemaChanges(node, data, state.edges);
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
      state.edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
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
      delete state.workflowInputVariables[key];
      state.edges = state.edges.filter(edge => edge.sourceHandle !== key);
    },
    updateWorkflowInputVariableKey: (state, action) => {
      const { oldKey, newKey } = action.payload;
      if (oldKey !== newKey) {
        state.workflowInputVariables[newKey] = state.workflowInputVariables[oldKey];
        delete state.workflowInputVariables[oldKey];
        state.edges = state.edges.map(edge => {
          if (edge.sourceHandle === oldKey) {
            return { ...edge, sourceHandle: newKey };
          }
          return edge;
        });
      }
    },
    resetFlow: (state, action) => {
      const { nodes, edges } = mapNodesAndEdges(action.payload.definition);
      state.nodes = nodes;
      state.edges = edges;
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
