import { createSlice } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Define initial state
const initialState = {
  nodes: [],
  edges: [],
  hoveredNode: null,
  selectedNode: null, // Add this to track the selected node
  nodeTypes: [
    {
        "name": "BasicLLMNode",
        "config": {
            "$defs": {
                "ModelName": {
                    "enum": [
                        "gpt-4o-mini",
                        "gpt-4o",
                        "o1-preview",
                        "o1-mini",
                        "gpt-4-turbo"
                    ],
                    "title": "ModelName",
                    "type": "string"
                }
            },
            "properties": {
                "llm_name": {
                    "$ref": "#/$defs/ModelName"
                },
                "max_tokens": {
                    "title": "Max Tokens",
                    "type": "integer"
                },
                "temperature": {
                    "title": "Temperature",
                    "type": "number"
                },
                "json_mode": {
                    "title": "Json Mode",
                    "type": "boolean"
                },
                "system_prompt": {
                    "title": "System Prompt",
                    "type": "string"
                },
                "few_shot_examples": {
                    "anyOf": [
                        {
                            "items": {
                                "additionalProperties": {
                                    "type": "string"
                                },
                                "type": "object"
                            },
                            "type": "array"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Few Shot Examples"
                }
            },
            "required": [
                "llm_name",
                "max_tokens",
                "temperature",
                "json_mode",
                "system_prompt"
            ],
            "title": "BasicLLMNodeConfig",
            "type": "object"
        },
        "input": {
            "properties": {
                "user_message": {
                    "title": "User Message",
                    "type": "string"
                }
            },
            "required": [
                "user_message"
            ],
            "title": "BasicLLMNodeInput",
            "type": "object"
        },
        "output": {
            "properties": {
                "assistant_message": {
                    "title": "Assistant Message",
                    "type": "string"
                }
            },
            "required": [
                "assistant_message"
            ],
            "title": "BasicLLMNodeOutput",
            "type": "object"
        }
    },
    {
        "name": "StructuredOutputLLMNode",
        "config": {
            "$defs": {
                "ModelName": {
                    "enum": [
                        "gpt-4o-mini",
                        "gpt-4o",
                        "o1-preview",
                        "o1-mini",
                        "gpt-4-turbo"
                    ],
                    "title": "ModelName",
                    "type": "string"
                }
            },
            "properties": {
                "llm_name": {
                    "$ref": "#/$defs/ModelName"
                },
                "max_tokens": {
                    "title": "Max Tokens",
                    "type": "integer"
                },
                "temperature": {
                    "title": "Temperature",
                    "type": "number"
                },
                "system_prompt": {
                    "title": "System Prompt",
                    "type": "string"
                },
                "output_schema": {
                    "additionalProperties": {
                        "type": "string"
                    },
                    "title": "Output Schema",
                    "type": "object"
                },
                "few_shot_examples": {
                    "anyOf": [
                        {
                            "items": {
                                "additionalProperties": {
                                    "type": "string"
                                },
                                "type": "object"
                            },
                            "type": "array"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Few Shot Examples"
                }
            },
            "required": [
                "llm_name",
                "max_tokens",
                "temperature",
                "system_prompt",
                "output_schema"
            ],
            "title": "StructuredOutputLLMNodeConfig",
            "type": "object"
        },
        "input": {
            "properties": {
                "user_message": {
                    "title": "User Message",
                    "type": "string"
                }
            },
            "required": [
                "user_message"
            ],
            "title": "StructuredOutputLLMNodeInput",
            "type": "object"
        },
        "output": {
            "properties": {},
            "title": "StructuredOutputLLMNodeOutput",
            "type": "object"
        }
    },
    {
        "name": "PythonFuncNode",
        "config": {
            "properties": {
                "code": {
                    "title": "Code",
                    "type": "code"
                },
                "input_schema": {
                    "additionalProperties": {
                        "type": "string"
                    },
                    "title": "Input Schema",
                    "type": "object"
                },
                "output_schema": {
                    "additionalProperties": {
                        "type": "string"
                    },
                    "title": "Output Schema",
                    "type": "object"
                }
            },
            "required": [
                "code",
                "input_schema",
                "output_schema"
            ],
            "title": "PythonFuncNodeConfig",
            "type": "object"
        },
        "input": {
            "properties": {},
            "title": "PythonFuncNodeInput",
            "type": "object"
        },
        "output": {
            "properties": {},
            "title": "PythonFuncNodeOutput",
            "type": "object"
        }
    }
]
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
