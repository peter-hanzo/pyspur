import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

const useFlowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes) =>
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    }),
  onEdgesChange: (changes) =>
    set({
      edges: applyEdgeChanges(changes, get().edges),
    }),
  onConnect: (connection) =>
    set({
      edges: [...get().edges, connection],
    }),
  addNode: (node) =>
    set({
      nodes: [...get().nodes, node],
    }),
  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }),
  // Add hoveredNode state and setHoveredNode action
  hoveredNode: null,
  setHoveredNode: (id) => set({ hoveredNode: id }),
}));

export default useFlowStore;