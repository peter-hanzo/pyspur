import { createSlice } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Define initial state
const initialState = {
  nodes: [],
  edges: [],
  hoveredNode: null,
  selectedNode: null, // Add this to track the selected node
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
      // if (node.type === 'LLMNode') {
      //   node.data = {
      //     ...node.data,
      //     prompt: node.data?.prompt || '', // Ensure prompt is initialized
      //   };
      // }
      console.log(node);
      state.nodes.push(node);
    },
    updateNodeData: (state, action) => {
      const { id, data } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.data = { ...node.data, ...data };
      }
      console.log(node);
    },
    setHoveredNode: (state, action) => {
      state.hoveredNode = action.payload.nodeId; // Correct the payload key here
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload.nodeId; // Track the selected node
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
  setSelectedNode, // Export the action for setting selected node
} = flowSlice.actions;

export default flowSlice.reducer;
