export const nodeTypes = {
  "primitives": [
    {
      "name": "ConstantValueNode",
      "acronym": "CVN",
      "color": "#FFDDC1",
      "input": {
        "properties": {},
        "title": "ConstantValueNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "ConstantValueNodeOutput",
        "type": "object"
      },
      "config": {
        "properties": {
          "values": {
            "title": "Values",
            "type": "object"
          }
        },
        "required": [
          "values"
        ],
        "title": "ConstantValueNodeConfig",
        "type": "object"
      }
    }
  ],
  "llm": [
    {
      "name": "StringOutputLLMNode",
      "acronym": "SOLN",
      "color": "#C1E1FF",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "StringOutputLLMNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "assistant_message": {
            "title": "Assistant Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "assistant_message"
        ],
        "title": "StringOutputLLMNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "json_mode": {
            "default": false,
            "title": "Json Mode",
            "type": "boolean"
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
            "value": null,
            "title": "Few Shot Examples"
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "system_prompt"
        ],
        "title": "StringOutputLLMNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "StructuredOutputNode",
      "acronym": "SON",
      "color": "#D1FFC1",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "StructuredOutputNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "StructuredOutputNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
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
            "value": null,
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
        "title": "StructuredOutputNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "AdvancedLLMNode",
      "acronym": "ALN",
      "color": "#FFC1C1",
      "input": {
        "properties": {},
        "title": "AdvancedNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "AdvancedNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "input_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "user_message": "str"
            },
            "title": "Input Schema",
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
            "value": null,
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
        "title": "AdvancedNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "MCTSNode",
      "acronym": "MCTS",
      "color": "#C1C1FF",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "MCTSNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "assistant_message": {
            "title": "Assistant Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "assistant_message"
        ],
        "title": "MCTSNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "num_simulations": {
            "title": "Num Simulations",
            "type": "integer",
            "value": 10
          },
          "simulation_depth": {
            "title": "Simulation Depth",
            "type": "integer",
            "value": 5
          },
          "exploration_weight": {
            "title": "Exploration Weight",
            "type": "number",
            "value": 1.4
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
            "value": null,
            "title": "Few Shot Examples"
          }
        },
        "required": [
          "llm_name",
          "system_prompt"
        ],
        "title": "MCTSNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "BestOfNNode",
      "acronym": "BoN",
      "color": "#FFD1C1",
      "input": {},
      "output": {},
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "input_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "user_message": "str"
            },
            "title": "Input Schema",
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "samples": {
            "title": "Samples",
            "type": "integer",
            "value": 3
          },
          "rating_prompt": {
            "title": "Rating Prompt",
            "type": "string",
            "value": "Rate the following response on a scale from 0 to 10, where 0 is poor and 10 is excellent. Consider factors such as relevance, coherence, and helpfulness. Respond with only a number."
          },
          "rating_temperature": {
            "title": "Rating Temperature",
            "type": "number",
            "value": 0.1
          },
          "rating_max_tokens": {
            "title": "Rating Max Tokens",
            "type": "integer",
            "value": 16
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "system_prompt",
          "output_schema"
        ],
        "title": "BestOfNNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "BranchSolveMergeNode",
      "acronym": "BSM",
      "color": "#C1FFD1",
      "input": {},
      "output": {},
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "input_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "user_message": "str"
            },
            "title": "Input Schema",
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "branch_prompt": {
            "title": "Branch Prompt",
            "type": "string",
            "value": "Please decompose the following task into multiple subtasks."
          },
          "solve_prompt": {
            "title": "Solve Prompt",
            "type": "string",
            "value": "Please provide a detailed solution for the following subtask:"
          },
          "merge_prompt": {
            "title": "Merge Prompt",
            "type": "string",
            "value": "Please combine the following solutions into a coherent and comprehensive final answer."
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "output_schema"
        ],
        "title": "BranchSolveMergeNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "MixtureOfAgentsNode",
      "acronym": "MoA",
      "color": "#E4D4F4",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "StringOutputLLMNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "assistant_message": {
            "title": "Assistant Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "assistant_message"
        ],
        "title": "StringOutputLLMNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "json_mode": {
            "default": false,
            "title": "Json Mode",
            "type": "boolean"
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "samples": {
            "title": "Samples",
            "type": "integer",
            "value": 3
          },
          "critique_prompt_template": {
            "title": "Critique Prompt Template",
            "type": "string",
            "value": "Original query: {initial_query}\n\nI will present you with {num_candidates} candidate responses to the original query. Please analyze and critique each response, discussing their strengths and weaknesses. Provide your analysis for each candidate separately.\n\n{candidates_section}Please provide your critique for each candidate:"
          },
          "final_prompt_template": {
            "title": "Final Prompt Template",
            "type": "string",
            "value": "Original query: {initial_query}\n\nBased on the following candidate responses and their critiques, generate a final response to the original query.\n\n{candidates_section}Critiques of all candidates:\n{critiques}\n\nPlease provide a final, optimized response to the original query:"
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "system_prompt"
        ],
        "title": "MixtureOfAgentsNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "SampleLLMNode",
      "acronym": "SLN",
      "color": "#F4E4D4",
      "input": {},
      "output": {},
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "input_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "user_message": "str"
            },
            "title": "Input Schema",
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "samples": {
            "title": "Samples",
            "type": "integer",
            "value": 1
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "system_prompt",
          "output_schema"
        ],
        "title": "SampleLLMNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "SelfConsistencyNode",
      "acronym": "SCN",
      "color": "#D4F4E4",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "StringOutputLLMNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "assistant_message": {
            "title": "Assistant Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "assistant_message"
        ],
        "title": "StringOutputLLMNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 1.0
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "json_mode": {
            "default": false,
            "title": "Json Mode",
            "type": "boolean"
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "samples": {
            "title": "Samples",
            "type": "integer",
            "value": 5
          },
          "similarity_threshold": {
            "title": "Similarity Threshold",
            "type": "number",
            "value": 0.8
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "temperature",
          "system_prompt"
        ],
        "title": "SelfConsistencyNodeConfig",
        "type": "object"
      }
    },
    {
      "name": "TreeOfThoughtsNode",
      "acronym": "ToT",
      "color": "#F4D4E4",
      "input": {
        "properties": {
          "user_message": {
            "title": "User Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "user_message"
        ],
        "title": "StringOutputLLMNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "assistant_message": {
            "title": "Assistant Message",
            "type": "string",
            "value": ""
          }
        },
        "required": [
          "assistant_message"
        ],
        "title": "StringOutputLLMNodeOutput",
        "type": "object"
      },
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
            "$ref": "#/$defs/ModelName",
            "value": "gpt-4o"
          },
          "max_tokens": {
            "title": "Max Tokens",
            "type": "integer",
            "value": 1024
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "value": 0.7
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string",
            "value": "You are a helpful assistant."
          },
          "json_mode": {
            "default": false,
            "title": "Json Mode",
            "type": "boolean"
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
            "value": null,
            "title": "Few Shot Examples"
          },
          "steps": {
            "title": "Steps",
            "type": "integer",
            "value": 3
          },
          "n_generate_sample": {
            "title": "N Generate Sample",
            "type": "integer",
            "value": 1
          },
          "n_evaluate_sample": {
            "title": "N Evaluate Sample",
            "type": "integer",
            "value": 1
          },
          "n_select_sample": {
            "title": "N Select Sample",
            "type": "integer",
            "value": 1
          },
          "method_generate": {
            "title": "Method Generate",
            "type": "string",
            "value": "sample"
          },
          "method_evaluate": {
            "title": "Method Evaluate",
            "type": "string",
            "value": "value"
          },
          "method_select": {
            "title": "Method Select",
            "type": "string",
            "value": "greedy"
          },
          "prompt_sample": {
            "title": "Prompt Sample",
            "type": "string",
            "value": "standard"
          },
          "stops": {
            "title": "Stops",
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "search_method": {
            "title": "Search Method",
            "type": "string",
            "value": "bfs"
          }
        },
        "required": [
          "llm_name",
          "max_tokens",
          "system_prompt"
        ],
        "title": "TreeOfThoughtsNodeConfig",
        "type": "object"
      }
    }
  ],
  "python": [
    {
      "name": "PythonFuncNode",
      "acronym": "PFN",
      "color": "#D4E4F4",
      "input": {
        "properties": {},
        "title": "PythonFuncNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "PythonFuncNodeOutput",
        "type": "object"
      },
      "config": {
        "properties": {
          "code": {
            "title": "Code",
            "type": "string"
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
      }
    }
  ],
  "subworkflow": [
    {
      "name": "SubworkflowNode",
      "acronym": "SWN",
      "color": "#F4D4C1",
      "input": {},
      "output": {},
      "config": {
        "properties": {
          "workflow_json": {
            "title": "Workflow Json",
            "type": "string"
          },
          "use_dask": {
            "default": false,
            "title": "Use Dask",
            "type": "boolean"
          }
        },
        "required": [
          "workflow_json"
        ],
        "title": "SubworkflowNodeConfig",
        "type": "object"
      }
    }
  ]
}
