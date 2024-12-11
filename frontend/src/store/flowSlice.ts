import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { createNode } from '../utils/nodeFactory';
import { config } from 'process';

interface Coordinates {
  x: number;
  y: number;
}

interface WorkflowNode {
  node_type: string;
  id: string;
  coordinates: Coordinates;
  config: Record<string, any>;
}

interface WorkflowLink {
  selected?: boolean;
  source_id: string;
  target_id: string;
  source_output_key: string;
  target_input_key: string;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  links: WorkflowLink[];
  input_variables?: Record<string, any>;
}

interface TestInput {
  id: string;
  [key: string]: any;
}

export interface FlowState {
  nodeTypes: string[];
  nodes: Node[];
  edges: Edge[];
  workflowID: string | null;
  selectedNode: string | null;
  sidebarWidth: number;
  projectName: string;
  workflowInputVariables: Record<string, any>;
  testInputs: TestInput[];
  inputNodeValues: Record<string, any>;
  history: {
    past: Array<{nodes: Node[], edges: Edge[]}>;
    future: Array<{nodes: Node[], edges: Edge[]}>;
  };
}

const initialState: FlowState = {
  nodeTypes: [],
  nodes: [],
  edges: [],
  workflowID: null,
  selectedNode: null,
  sidebarWidth: 400,
  projectName: 'Untitled Project',
  workflowInputVariables: {},
  testInputs: [],
  inputNodeValues: {},
  history: {
    past: [],
    future: []
  }
};

const saveToHistory = (state: FlowState) => {
  state.history.past.push({
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges))
  });
  state.history.future = [];
};

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    initializeFlow: (state, action: PayloadAction<{
      workflowID: string;
      definition: WorkflowDefinition;
      name: string;
      nodeTypes: string[];
    }>) => {
      const { workflowID, definition, name } = action.payload;
      state.workflowID = workflowID;
      state.projectName = name;
      state.nodeTypes = action.payload.nodeTypes;
      const { nodes, links } = definition;

      state.nodes = nodes.map(node =>
        createNode(state.nodeTypes, node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { config: node.config })
      );

      let edges = links.map(link => (
        {
        id: uuidv4(),
        key: uuidv4(),
        selected: link.selected || false,
        source: link.source_id,
        target: link.target_id,
        sourceHandle: state.nodes.find(node => node.id === link.source_id)?.data?.config.title || state.nodes.find(node => node.id === link.source_id)?.data?.title,
        targetHandle: state.nodes.find(node => node.id === link.source_id)?.data?.config.title || state.nodes.find(node => node.id === link.source_id)?.data?.title,
      }));


      if (definition.input_variables) {
        state.workflowInputVariables = definition.input_variables;
      }
    },

    nodesChange: (state, action: PayloadAction<{ changes: NodeChange[] }>) => {
      state.nodes = applyNodeChanges(action.payload.changes, state.nodes);
    },

    edgesChange: (state, action: PayloadAction<{ changes: EdgeChange[] }>) => {
      state.edges = applyEdgeChanges(action.payload.changes, state.edges);
    },

    connect: (state, action: PayloadAction<{ connection: Connection }>) => {
      saveToHistory(state);
      let { connection } = action.payload;
      // make target handle the same as source handle
      connection = { ...connection, targetHandle: connection.sourceHandle };
      state.edges = addEdge(connection, state.edges);
    },

    addNode: (state, action: PayloadAction<{ node: Node }>) => {
      if (action.payload.node) {
        saveToHistory(state);
        state.nodes = [...state.nodes, action.payload.node];
      }
    },

    setNodes: (state, action: PayloadAction<{ nodes: Node[] }>) => {
      state.nodes = action.payload.nodes;
    },

    // // ... rest of the reducers with proper type annotations ...
    // I'll show a few more examples and you can follow the pattern:

    updateNodeData: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const { id, data } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },

    updateTitleInEdges: (state, action: PayloadAction<{ nodeId: string; newTitle: string }>) => {
      const { nodeId, newTitle } = action.payload;
      state.edges = state.edges.map((edge) => {
        if (edge.source === nodeId) {
          return { ...edge, sourceHandle: newTitle, targetHandle: newTitle };
        }
        return edge;
      });
    },

    setSelectedNode: (state, action: PayloadAction<{ nodeId: string | null }>) => {
      state.selectedNode = action.payload.nodeId;
    },

    deleteNode: (state, action: PayloadAction<{ nodeId: string }>) => {
      const nodeId = action.payload.nodeId;
      saveToHistory(state);
      state.nodes = state.nodes.filter((node) => node.id !== nodeId);
      state.edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      if (state.selectedNode === nodeId) {
        state.selectedNode = null;
      }
    },

    deleteEdge: (state, action: PayloadAction<{ edgeId: string }>) => {
      saveToHistory(state);
      const edgeId = action.payload.edgeId;
      state.edges = state.edges.filter((edge) => edge.id !== edgeId);
    },

    deleteEdgeByHandle: (state, action: PayloadAction<{ nodeId: string; handleKey: string }>) => {
      const { nodeId, handleKey } = action.payload;
      state.edges = state.edges.filter((edge) => {
        if (edge.source === nodeId && edge.sourceHandle === handleKey) {
          return false;
        }
        if (edge.target === nodeId && edge.targetHandle === handleKey) {
          return false;
        }
        return true;
      });
    },

    deleteEdgesBySource: (state, action: PayloadAction<{ sourceId: string }>) => {
      const { sourceId } = action.payload;
      state.edges = state.edges.filter((edge) => edge.source !== sourceId);
    },

    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = action.payload;
    },

    setProjectName: (state, action: PayloadAction<string>) => {
      state.projectName = action.payload;
    },

    setWorkflowInputVariable: (state, action: PayloadAction<{ key: string; value: any }>) => {
      const { key, value } = action.payload;
      state.workflowInputVariables[key] = value;
      // Set the output schema for the input node
      const inputNode = state.nodes.find(node => node.type === 'InputNode');
      if (inputNode && inputNode.data) {
        const currentConfig = inputNode.data.config || {};
        const currentSchema = currentConfig.output_schema || {};
        inputNode.data.config = {
          ...currentConfig,
          output_schema: {
            ...currentSchema,
            [key]: value
          }
        };
      }
    },

    deleteWorkflowInputVariable: (state, action: PayloadAction<{ key: string }>) => {
      const { key } = action.payload;
      delete state.workflowInputVariables[key];
      state.edges = state.edges.filter(edge => edge.sourceHandle !== key);
    },

    updateWorkflowInputVariableKey: (state, action: PayloadAction<{ oldKey: string; newKey: string }>) => {
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

    resetFlow: (state, action: PayloadAction<{ definition: WorkflowDefinition }>) => {
      const { nodes, links } = action.payload.definition;
      state.nodes = nodes.map(node =>
        createNode(state.nodeTypes, node.node_type, node.id,
          { x: node.coordinates.x, y: node.coordinates.y },
          { config: node.config })
      );

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

    updateEdgesOnHandleRename: (state, action: PayloadAction<{
      nodeId: string;
      oldHandleId: string;
      newHandleId: string;
      schemaType: 'input_schema' | 'output_schema';
    }>) => {
      const { nodeId, oldHandleId, newHandleId, schemaType } = action.payload;
      state.edges = state.edges.map((edge) => {
        if (schemaType === 'input_schema' && edge.target === nodeId && edge.targetHandle === oldHandleId) {
          return { ...edge, targetHandle: newHandleId };
        }
        if (schemaType === 'output_schema' && edge.source === nodeId && edge.sourceHandle === oldHandleId) {
          return { ...edge, sourceHandle: newHandleId };
        }
        return edge;
      });
    },

    resetRun: (state) => {
      state.nodes = state.nodes.map(node => ({
        ...node,
        data: { ...node.data, run: undefined }
      }));
    },

    clearCanvas: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNode = null;
      state.workflowInputVariables = {};
      state.testInputs = [];
      state.inputNodeValues = {};
    },

    setTestInputs: (state, action: PayloadAction<TestInput[]>) => {
      state.testInputs = action.payload;
    },
    setNodeOutputs: (state, action) => {
      const nodeOutputs = action.payload;

      state.nodes = state.nodes.map(node => {
        if (node && nodeOutputs[node.id]) {
          return {
            ...node,
            data: {
              ...node.data,
              run: nodeOutputs[node.id],
            },
          };
        }
        return node;
      });
    },
    addTestInput: (state, action) => {
      state.testInputs = [
        ...state.testInputs,
        action.payload,
      ];
    },

    updateTestInput: (state, action: PayloadAction<TestInput>) => {
      const updatedInput = action.payload;
      state.testInputs = state.testInputs.map((input) =>
        input.id === updatedInput.id ? updatedInput : input
      );
    },

    deleteTestInput: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      state.testInputs = state.testInputs.filter((input) => input.id !== id);
    },

    setEdges: (state, action) => {
      state.edges = action.payload.edges;
    },

    undo: (state) => {
      const previous = state.history.past.pop();
      if (previous) {
        state.history.future.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges))
        });
        state.nodes = previous.nodes;
        state.edges = previous.edges;
      }
    },

    redo: (state) => {
      const next = state.history.future.pop();
      if (next) {
        state.history.past.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges))
        });
        state.nodes = next.nodes;
        state.edges = next.edges;
      }
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
  updateTitleInEdges,
  setSelectedNode,
  deleteNode,
  deleteEdge,
  deleteEdgeByHandle,
  deleteEdgesBySource,
  setSidebarWidth,
  setProjectName,
  setWorkflowInputVariable,
  deleteWorkflowInputVariable,
  updateWorkflowInputVariableKey,
  resetFlow,
  updateEdgesOnHandleRename,
  resetRun,
  clearCanvas,
  setTestInputs,
  setNodeOutputs,
  addTestInput,
  updateTestInput,
  deleteTestInput,
  undo,
  redo,
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state: { flow: FlowState }, nodeId: string): Node | undefined => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};