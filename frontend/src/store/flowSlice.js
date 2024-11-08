import { createSlice, createAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { createNode } from '../components/nodes/nodeFactory';


const initialState = {
  workflowID: null,
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
    setWorkflowID: (state, action) => {
      state.workflowID = action.payload;
    },
    initializeFlow: (state, action) => {
      const { definition } = action.payload;
      const { nodes, links } = definition;

      // Map nodes to the expected format
      let mappedNodes = nodes.map(node =>
        createNode(node.node_type, node.id, { x: 0, y: 0 }, { userconfig: node.config })
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

    clearCanvas: (state) => {
      // Update clearCanvas to maintain at least the input node
      state.nodes = [];
      state.edges = [];
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
  clearCanvas,
  setWorkflowID
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state, nodeId) => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};
