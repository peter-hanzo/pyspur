import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { createNode } from '../utils/nodeFactory';
import { config, title } from 'process';
import { TestInput } from '@/types/api_types/workflowSchemas';
import { WorkflowDefinition, WorkflowNodeCoordinates } from '@/types/api_types/workflowSchemas';
import { RouteConditionGroup } from '@/types/api_types/routerSchemas';
import { isEqual } from 'lodash';

type NodeTypes = {
  [key: string]: any;
};
interface NodeTypesConfig {
  [category: string]: Array<{
    name: string;
    [key: string]: any;
  }>;
}



export interface FlowWorkflowNode {
  id: string;
  type: string;
  position: WorkflowNodeCoordinates;
  data: {
    title: string;
    acronym: string;
    color: string;
    config: {
      title?: string;
      output_schema?: Record<string, any>;
      llm_info?: Record<string, any>;
      system_message?: string;
      user_message?: string;
      few_shot_examples?: Record<string, any>[] | null;
      route_map?: Record<string, RouteConditionGroup>;
      [key: string]: any;
    },
    run?: Record<string, any>;
    taskStatus?: string;
    [key: string]: any;
  };
  measured?: {
    width: number;
    height: number;
  };
  [key: string]: any;
}

export interface FlowWorkflowEdge {
  id: string;
  key: string;
  source: string;
  target: string;
  selected?: boolean;
  sourceHandle: string;
  targetHandle: string;
  [key: string]: any;
}

export interface FlowState {
  nodeTypes: NodeTypes;
  nodes: FlowWorkflowNode[];
  edges: FlowWorkflowEdge[];
  workflowID: string | null;
  selectedNode: string | null;
  sidebarWidth: number;
  projectName: string;
  workflowInputVariables: Record<string, any>;
  testInputs: TestInput[];
  inputNodeValues: Record<string, any>;
  history: {
    past: Array<{ nodes: FlowWorkflowNode[], edges: FlowWorkflowEdge[] }>;
    future: Array<{ nodes: FlowWorkflowNode[], edges: FlowWorkflowEdge[] }>;
  };
}

const initialState: FlowState = {
  nodeTypes: {},
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

function rebuildRouterNodeSchema(state: FlowState, routerNode: FlowWorkflowNode) {
  const incomingEdges = state.edges.filter((edge) => edge.target === routerNode.id);

  // Build new output schema by combining all source nodes
  const newOutputSchema = incomingEdges.reduce((schema, edge) => {
    const sourceNode = state.nodes.find((n) => n.id === edge.source);
    if (sourceNode?.data?.config?.output_schema) {
      const nodeTitle = sourceNode.data.config.title || sourceNode.id;
      const sourceSchema = sourceNode.data.config.output_schema;

      // Add prefixed entries from the source schema
      Object.entries(sourceSchema).forEach(([key, value]) => {
        schema[`${nodeTitle}.${key}`] = value;
      });
    }
    return schema;
  }, {} as Record<string, any>);

  const currentSchema = routerNode.data.config.output_schema || {};
  const hasChanges = !isEqual(currentSchema, newOutputSchema);

  // Only update if there are actual changes
  if (hasChanges) {
    routerNode.data.config.output_schema = newOutputSchema;
  }
}

function rebuildCoalesceNodeSchema(state: FlowState, coalesceNode: FlowWorkflowNode) {
  const incomingEdges = state.edges.filter((edge) => edge.target === coalesceNode.id);

  // Collect all source schemas
  const schemas: Record<string, any>[] = incomingEdges.map((ed) => {
    const sourceNode = state.nodes.find((n) => n.id === ed.source);
    return sourceNode?.data?.config?.output_schema || {};
  });

  // Intersection
  let intersection: Record<string, any> = {};
  if (schemas.length > 0) {
    const firstSchema = schemas[0];
    const commonKeys = Object.keys(firstSchema).filter((key) =>
      schemas.every((sch) => sch.hasOwnProperty(key) && sch[key] === firstSchema[key])
    );
    commonKeys.forEach((key) => {
      intersection[key] = firstSchema[key];
    });
  }

  coalesceNode.data.config.output_schema = intersection;
}

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    initializeFlow: (state, action: PayloadAction<{
      workflowID: string;
      definition: WorkflowDefinition;
      name: string;
      nodeTypes: NodeTypesConfig;
    }>) => {
      const { workflowID, definition, name } = action.payload;
      state.workflowID = workflowID;
      state.projectName = name;
      state.nodeTypes = action.payload.nodeTypes;
      const { nodes, links } = definition;

      state.nodes = nodes.map(node =>
        createNode(state.nodeTypes, node.node_type, node.id, { x: node.coordinates.x, y: node.coordinates.y }, { config: node.config })
      );

      let edges = links.map(link => ({
        id: uuidv4(),
        key: uuidv4(),
        selected: false,
        source: link.source_id,
        target: link.target_id,
        sourceHandle: link.source_handle || state.nodes.find(node => node.id === link.source_id)?.data?.config.title || state.nodes.find(node => node.id === link.source_id)?.data?.title,
        targetHandle: link.target_handle || state.nodes.find(node => node.id === link.source_id)?.data?.config.title || state.nodes.find(node => node.id === link.source_id)?.data?.title,
      }));
      // deduplicate edges
      edges = edges.filter((edge, index, self) =>
        index === self.findIndex((t) => (
          t.source === edge.source && t.target === edge.target
        ))
      );
      state.edges = edges;


    },

    nodesChange: (state, action: PayloadAction<{ changes: NodeChange[] }>) => {
      state.nodes = applyNodeChanges(action.payload.changes, state.nodes) as FlowWorkflowNode[];
    },

    edgesChange: (state, action: PayloadAction<{ changes: EdgeChange[] }>) => {
      state.edges = applyEdgeChanges(action.payload.changes, state.edges) as FlowWorkflowEdge[];
    },

    connect: (state, action: PayloadAction<{ connection: Connection }>) => {
      saveToHistory(state);
      const { connection } = action.payload;

      // Avoid duplicates
      if (state.edges.find((edge) => edge.source === connection.source && edge.target === connection.target)) {
        return;
      }
      state.edges = addEdge(connection, state.edges);

      const targetNode = state.nodes.find((node) => node.id === connection.target);
      if (!targetNode) return;

      // If it's a RouterNode, rebuild schema
      if (targetNode.type === 'RouterNode') {
        rebuildRouterNodeSchema(state, targetNode);
      }
      // If it's a CoalesceNode, rebuild intersection
      if (targetNode.type === 'CoalesceNode') {
        rebuildCoalesceNodeSchema(state, targetNode);
      }
    },

    addNode: (state, action: PayloadAction<{ node: FlowWorkflowNode }>) => {
      if (action.payload.node) {
        saveToHistory(state);
        state.nodes = [...state.nodes, action.payload.node];
      }
    },

    setNodes: (state, action: PayloadAction<{ nodes: FlowWorkflowNode[] }>) => {
      state.nodes = action.payload.nodes;
    },


    updateNodeData: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const { id, data } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (!node) return;

      const oldTitle = node.data?.config?.title || node.data?.title;
      const newTitle = data?.config?.title || data?.title;

      // Update node's data
      node.data = { ...node.data, ...data };

      // If the node title changed, update edges
      if (oldTitle && newTitle && oldTitle !== newTitle) {
        state.edges = state.edges.map((edge) => {
          if (edge.source === id && edge.sourceHandle === oldTitle) {
            return { ...edge, sourceHandle: newTitle };
          }
          if (edge.target === id && edge.targetHandle === oldTitle) {
            return { ...edge, targetHandle: newTitle };
          }
          return edge;
        });
      }

      // If output_schema changed, rebuild connected RouterNode/CoalesceNode schemas
      if (data?.config?.output_schema) {
        const connectedRouterNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'RouterNode' &&
            state.edges.some((edge) => edge.source === id && edge.target === targetNode.id)
        );
        connectedRouterNodes.forEach((routerNode) => {
          rebuildRouterNodeSchema(state, routerNode);
        });

        const connectedCoalesceNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'CoalesceNode' &&
            state.edges.some((edge) => edge.source === id && edge.target === targetNode.id)
        );
        connectedCoalesceNodes.forEach((coalesceNode) => {
          rebuildCoalesceNodeSchema(state, coalesceNode);
        });
      }
    },

    updateTitleInEdges: (state, action: PayloadAction<{ nodeId: string; newTitle: string }>) => {
      const { nodeId, newTitle } = action.payload;

      // First, update edges
      state.edges = state.edges.map((edge) => {
        if (edge.source === nodeId) {
          // Only update sourceHandle when the renamed node is the source
          return { ...edge, sourceHandle: newTitle };
        }
        if (edge.target === nodeId) {
          // Update targetHandle when the renamed node is the target
          return { ...edge, targetHandle: newTitle };
        }
        return edge;
      });

      // Find all nodes that are downstream from the renamed node
      const findDownstreamNodes = (startNodeId: string): Set<string> => {
        const visited = new Set<string>();
        const queue = [startNodeId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (!visited.has(currentId)) {
            visited.add(currentId);
            // Find all edges where current node is the source
            state.edges
              .filter(edge => edge.source === currentId)
              .forEach(edge => {
                queue.push(edge.target);
              });
          }
        }
        return visited;
      };

      const downstreamNodes = findDownstreamNodes(nodeId);

      // Update only the downstream nodes' content
      state.nodes = state.nodes.map((node) => {
        // Skip nodes that aren't downstream from the renamed node
        if (!downstreamNodes.has(node.id)) {
          return node;
        }

        if (node.data?.config) {
          const config = { ...node.data.config };
          let hasChanges = false;

          // Update references in system_message, user_message, and any field ending with _prompt or _message
          Object.keys(config).forEach((key) => {
            if (
              key === 'system_message' ||
              key === 'user_message' ||
              key.endsWith('_prompt') ||
              key.endsWith('_message')
            ) {
              const content = config[key];
              if (typeof content === 'string') {
                // Replace old node references with new ones
                const oldPattern = new RegExp(`{{${nodeId}\\.`, 'g');
                const newContent = content.replace(oldPattern, `{{${newTitle}.`);
                if (newContent !== content) {
                  config[key] = newContent;
                  hasChanges = true;
                }
              }
            }
          });

          // Only create a new node object if there were actual changes
          if (hasChanges) {
            return {
              ...node,
              data: {
                ...node.data,
                config
              }
            };
          }
        }
        return node;
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
      const edge = state.edges.find(e => e.id === edgeId);

      if (edge) {
        // Find the target node
        const targetNode = state.nodes.find(node => node.id === edge.target);
        const sourceNode = state.nodes.find(node => node.id === edge.source);

        // If target is a RouterNode and source has output schema, update target's schema
        if (targetNode?.type === 'RouterNode' && sourceNode?.data?.config?.output_schema) {
          const sourceTitle = sourceNode.data.config.title || sourceNode.id;
          const currentSchema = { ...targetNode.data.config.output_schema };

          // Remove fields that start with this source's prefix
          const prefix = `${sourceTitle}.`;
          Object.keys(currentSchema).forEach(key => {
            if (key.startsWith(prefix)) {
              delete currentSchema[key];
            }
          });

          // Update the target node's schema
          targetNode.data.config = {
            ...targetNode.data.config,
            output_schema: currentSchema
          };
        }

        if (targetNode?.type === 'CoalesceNode') {
          // Filter out the edge we're deleting so it doesn't appear in the intersection
          const incomingEdges = state.edges.filter((e) => e.target === targetNode.id && e.id !== edgeId);

          // Collect all source schemas from remaining edges
          const schemas: Record<string, any>[] = [];
          incomingEdges.forEach((ed) => {
            const sourceNode = state.nodes.find((n) => n.id === ed.source);
            if (sourceNode?.data?.config?.output_schema) {
              schemas.push(sourceNode.data.config.output_schema);
            }
          });

          // Compute intersection
          let intersection: Record<string, any> = {};
          if (schemas.length > 0) {
            const firstSchema = schemas[0];
            const commonKeys = Object.keys(firstSchema).filter((key) =>
              schemas.every((sch) => sch.hasOwnProperty(key) && sch[key] === firstSchema[key])
            );
            commonKeys.forEach((key) => {
              intersection[key] = firstSchema[key];
            });
          }
          targetNode.data.config.output_schema = intersection;
        }

        // Remove the edge
        state.edges = state.edges.filter((e) => e.id !== edgeId);
      }
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
      const inputNode = state.nodes.find((node) => node.type === 'InputNode');
      if (inputNode && inputNode.data) {
        const currentConfig = inputNode.data.config || {};
        const currentSchema = currentConfig.output_schema || {};
        inputNode.data.config = {
          ...currentConfig,
          output_schema: {
            ...currentSchema,
            [key]: value,
          },
        };
      }

      if (inputNode?.id) {
        // Update RouterNodes directly connected
        const connectedRouterNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'RouterNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedRouterNodes.forEach((routerNode) => {
          rebuildRouterNodeSchema(state, routerNode);
        });

        // Update CoalesceNodes directly connected
        const connectedCoalesceNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'CoalesceNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedCoalesceNodes.forEach((coalesceNode) => {
          rebuildCoalesceNodeSchema(state, coalesceNode);
        });
      }
    },

    deleteWorkflowInputVariable: (state, action: PayloadAction<{ key: string }>) => {
      const { key } = action.payload;

      // Remove from input node output schema
      const inputNode = state.nodes.find((node) => node.type === 'InputNode');
      if (inputNode && inputNode.data) {
        const currentConfig = inputNode.data.config || {};
        const currentSchema = currentConfig.output_schema || {};
        delete currentSchema[key];
        inputNode.data.config = {
          ...currentConfig,
          output_schema: currentSchema,
        };
      }
      // Remove from global workflowInputVariables
      delete state.workflowInputVariables[key];

      // Remove edges whose sourceHandle === key
      state.edges = state.edges.filter((edge) => edge.sourceHandle !== key);

      if (inputNode?.id) {
        // Update RouterNodes
        const connectedRouterNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'RouterNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedRouterNodes.forEach((routerNode) => {
          rebuildRouterNodeSchema(state, routerNode);
        });

        // Update CoalesceNodes
        const connectedCoalesceNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'CoalesceNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedCoalesceNodes.forEach((coalesceNode) => {
          rebuildCoalesceNodeSchema(state, coalesceNode);
        });
      }
    },

    updateWorkflowInputVariableKey: (
      state,
      action: PayloadAction<{ oldKey: string; newKey: string }>
    ) => {
      const { oldKey, newKey } = action.payload;

      // Only proceed if keys differ
      if (oldKey === newKey) return;

      // 1. Rename in `workflowInputVariables` map
      state.workflowInputVariables[newKey] = state.workflowInputVariables[oldKey];
      delete state.workflowInputVariables[oldKey];

      // 2. Rename in the input node’s output_schema
      const inputNode = state.nodes.find((node) => node.type === 'InputNode');
      if (inputNode && inputNode.data) {
        const currentConfig = inputNode.data.config || {};
        const currentSchema = currentConfig.output_schema || {};
        if (currentSchema.hasOwnProperty(oldKey)) {
          currentSchema[newKey] = currentSchema[oldKey];
          delete currentSchema[oldKey];
        }
        inputNode.data.config = {
          ...currentConfig,
          output_schema: currentSchema,
        };
      }

      // 3. Rename in any edges referencing oldKey
      state.edges = state.edges.map((edge) => {
        if (edge.sourceHandle === oldKey) {
          return { ...edge, sourceHandle: newKey };
        }
        return edge;
      });

      // 4. Rebuild RouterNode/CoalesceNode schemas connected to the input node,
      if (inputNode?.id) {
        const connectedRouterNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'RouterNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedRouterNodes.forEach((routerNode) => {
          rebuildRouterNodeSchema(state, routerNode);
        });

        const connectedCoalesceNodes = state.nodes.filter(
          (targetNode) =>
            targetNode.type === 'CoalesceNode' &&
            state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
        );
        connectedCoalesceNodes.forEach((coalesceNode) => {
          rebuildCoalesceNodeSchema(state, coalesceNode);
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
        selected: false,
        source: link.source_id,
        target: link.target_id,
        sourceHandle: link.source_id,
        targetHandle: link.source_id,
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
        data: { ...node.data, run: undefined, taskStatus: undefined }
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

    deleteTestInput: (state, action: PayloadAction<{ id: number }>) => {
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

    updateNodeTitle: (state, action: PayloadAction<{ nodeId: string; newTitle: string }>) => {
      const { nodeId, newTitle } = action.payload;

      // Update the node title
      const node = state.nodes.find(node => node.id === nodeId);
      if (node && node.data) {
        node.data.config = {
          ...node.data.config,
          title: newTitle
        };
      }

      // Update edges where this node is source or target
      state.edges = state.edges.map(edge => {
        if (edge.source === nodeId) {
          return { ...edge, sourceHandle: newTitle, targetHandle: newTitle };
        }
        return edge;
      });

      // Update references in downstream nodes
      const findDownstreamNodes = (startNodeId: string): Set<string> => {
        const visited = new Set<string>();
        const queue = [startNodeId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (!visited.has(currentId)) {
            visited.add(currentId);
            state.edges
              .filter(edge => edge.source === currentId)
              .forEach(edge => queue.push(edge.target));
          }
        }
        return visited;
      };

      const downstreamNodes = findDownstreamNodes(nodeId);

      state.nodes = state.nodes.map(node => {
        if (!downstreamNodes.has(node.id)) return node;

        if (node.data?.config) {
          const config = { ...node.data.config };
          let hasChanges = false;

          Object.keys(config).forEach(key => {
            if (
              key === 'system_message' ||
              key === 'user_message' ||
              key.endsWith('_prompt') ||
              key.endsWith('_message')
            ) {
              const content = config[key];
              if (typeof content === 'string') {
                const oldPattern = new RegExp(`{{${nodeId}\\.`, 'g');
                const newContent = content.replace(oldPattern, `{{${newTitle}.`);
                if (newContent !== content) {
                  config[key] = newContent;
                  hasChanges = true;
                }
              }
            }
          });

          if (hasChanges) {
            return {
              ...node,
              data: {
                ...node.data,
                config
              }
            };
          }
        }
        return node;
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
  updateNodeTitle,
} = flowSlice.actions;

export default flowSlice.reducer;

export const selectNodeById = (state: { flow: FlowState }, nodeId: string): FlowWorkflowNode | undefined => {
  return state.flow.nodes.find((node) => node.id === nodeId);
};