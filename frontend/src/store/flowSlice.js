import { createSlice, createAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

const initialState = {
  nodes: [],
  edges: [],
  hoveredNode: null,
  selectedNode: null,
  sidebarWidth: 400,
  projectName: 'Untitled Project',
};

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
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
      const node = action.payload.node;
      state.nodes.push(node);
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
        node.data = { ...node.data, ...data };
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
    detachNodes: (state, action) => {
      const { nodeIds, groupId } = action.payload;
      const groupNode = state.nodes.find(n => n.id === groupId);

      state.nodes = state.nodes.map(node => {
        if (nodeIds.includes(node.id)) {
          return {
            ...node,
            position: {
              x: node.position.x + groupNode.position.x,
              y: node.position.y + groupNode.position.y
            },
            parentId: undefined,
            extent: undefined
          };
        }
        return node;
      }).filter(node => node.id !== groupId);
    },
    clearCanvas: (state) => {
      state.nodes = [];
      state.edges = [];
    },
  },
});

export const {
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
  detachNodes,
  clearCanvas
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state, nodeId) => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};
