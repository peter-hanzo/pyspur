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
}));

export default useFlowStore;