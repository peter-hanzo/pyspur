import { createSlice } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Define initial state
const initialState = {
  nodes: [],
  edges: [],
  hoveredNode: null,
  selectedNode: null, // Add this to track the selected node
  reactFlowInstance: null, // Add reactFlowInstance to the initial state
};

// Create the flow slice
const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    nodesChange: (state, action) => {
      state.nodes = applyNodeChanges(action.payload.changes, state.nodes);
    },
    edgesChange: (state, action) => {
      state.edges = applyEdgeChanges(action.payload.changes, state.edges);
    },
    connect: (state, action) => {
      state.edges.push(action.payload.connection);
    },
    addNode: (state, action) => {
      const node = action.payload.node;

      // Initialize the prompt field for LLMNode types
      if (node.type === 'LLMNode') {
        node.data = {
          ...node.data,
          prompt: node.data?.prompt || '', // Ensure prompt is initialized
        };
      }

      state.nodes.push(node);
    },
    updateNodeData: (state, action) => {
      const { id, data } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },
    setHoveredNode: (state, action) => {
      state.hoveredNode = action.payload.nodeId; // Correct the payload key here
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload.nodeId; // Track the selected node
    },
    setReactFlowInstance: (state, action) => {
      state.reactFlowInstance = action.payload.instance; // Set the reactFlowInstance
    },
  },
});

// Export the action creators and reducer
export const {
  nodesChange,
  edgesChange,
  connect,
  addNode,
  updateNodeData,
  setHoveredNode,
  setSelectedNode,
  setReactFlowInstance, // Export the action for setting reactFlowInstance
} = flowSlice.actions;

export default flowSlice.reducer;
