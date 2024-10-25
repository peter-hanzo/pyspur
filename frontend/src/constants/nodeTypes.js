export const nodeTypes = {
    "primitives": [
      {
        "name": "ConstantValueNode",
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
          "title": "StringOutputLLMNodeInput",
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
              "default": null,
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
          "title": "StructuredOutputNodeConfig",
          "type": "object"
        }
      },
      {
        "name": "AdvancedLLMNode",
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
          "title": "AdvancedNodeConfig",
          "type": "object"
        }
      },
      {
        "name": "MCTSNode",
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
          "title": "MCTSNodeInput",
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
              "$ref": "#/$defs/ModelName"
            },
            "max_tokens": {
              "default": 1024,
              "title": "Max Tokens",
              "type": "integer"
            },
            "temperature": {
              "default": 1,
              "title": "Temperature",
              "type": "number"
            },
            "system_prompt": {
              "title": "System Prompt",
              "type": "string"
            },
            "num_simulations": {
              "default": 10,
              "title": "Num Simulations",
              "type": "integer"
            },
            "simulation_depth": {
              "default": 5,
              "title": "Simulation Depth",
              "type": "integer"
            },
            "exploration_weight": {
              "default": 1.4,
              "title": "Exploration Weight",
              "type": "number"
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
            "system_prompt"
          ],
          "title": "MCTSNodeConfig",
          "type": "object"
        }
      },
      {
        "name": "BestOfNNode",
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "samples": {
              "default": 3,
              "title": "Samples",
              "type": "integer"
            },
            "rating_prompt": {
              "default": "Rate the following response on a scale from 0 to 10, where 0 is poor and 10 is excellent. Consider factors such as relevance, coherence, and helpfulness. Respond with only a number.",
              "title": "Rating Prompt",
              "type": "string"
            },
            "rating_temperature": {
              "default": 0.1,
              "title": "Rating Temperature",
              "type": "number"
            },
            "rating_max_tokens": {
              "default": 16,
              "title": "Rating Max Tokens",
              "type": "integer"
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
              "default": "",
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "branch_prompt": {
              "default": "Please decompose the following task into multiple subtasks.",
              "title": "Branch Prompt",
              "type": "string"
            },
            "solve_prompt": {
              "default": "Please provide a detailed solution for the following subtask:",
              "title": "Solve Prompt",
              "type": "string"
            },
            "merge_prompt": {
              "default": "Please combine the following solutions into a coherent and comprehensive final answer.",
              "title": "Merge Prompt",
              "type": "string"
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
          "title": "StringOutputLLMNodeInput",
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "samples": {
              "default": 3,
              "title": "Samples",
              "type": "integer"
            },
            "critique_prompt_template": {
              "default": "Original query: {initial_query}\n\nI will present you with {num_candidates} candidate responses to the original query. Please analyze and critique each response, discussing their strengths and weaknesses. Provide your analysis for each candidate separately.\n\n{candidates_section}Please provide your critique for each candidate:",
              "title": "Critique Prompt Template",
              "type": "string"
            },
            "final_prompt_template": {
              "default": "Original query: {initial_query}\n\nBased on the following candidate responses and their critiques, generate a final response to the original query.\n\n{candidates_section}Critiques of all candidates:\n{critiques}\n\nPlease provide a final, optimized response to the original query:",
              "title": "Final Prompt Template",
              "type": "string"
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "samples": {
              "default": 1,
              "title": "Samples",
              "type": "integer"
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
          "title": "StringOutputLLMNodeInput",
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "samples": {
              "default": 5,
              "title": "Samples",
              "type": "integer"
            },
            "similarity_threshold": {
              "default": 0.8,
              "title": "Similarity Threshold",
              "type": "number"
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
          "title": "StringOutputLLMNodeInput",
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
              "$ref": "#/$defs/ModelName"
            },
            "max_tokens": {
              "title": "Max Tokens",
              "type": "integer"
            },
            "temperature": {
              "default": 0.7,
              "title": "Temperature",
              "type": "number"
            },
            "system_prompt": {
              "title": "System Prompt",
              "type": "string"
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
              "default": null,
              "title": "Few Shot Examples"
            },
            "steps": {
              "default": 3,
              "title": "Steps",
              "type": "integer"
            },
            "n_generate_sample": {
              "default": 1,
              "title": "N Generate Sample",
              "type": "integer"
            },
            "n_evaluate_sample": {
              "default": 1,
              "title": "N Evaluate Sample",
              "type": "integer"
            },
            "n_select_sample": {
              "default": 1,
              "title": "N Select Sample",
              "type": "integer"
            },
            "method_generate": {
              "default": "sample",
              "title": "Method Generate",
              "type": "string"
            },
            "method_evaluate": {
              "default": "value",
              "title": "Method Evaluate",
              "type": "string"
            },
            "method_select": {
              "default": "greedy",
              "title": "Method Select",
              "type": "string"
            },
            "prompt_sample": {
              "default": "standard",
              "title": "Prompt Sample",
              "type": "string"
            },
            "stops": {
              "default": [],
              "items": {
                "type": "string"
              },
              "title": "Stops",
              "type": "array"
            },
            "search_method": {
              "default": "bfs",
              "title": "Search Method",
              "type": "string"
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