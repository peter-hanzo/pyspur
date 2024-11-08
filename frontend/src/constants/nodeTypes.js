export const nodeTypes = {
  "primitives": [
    {
      "name": "InputNode",
      "input": {
        "properties": {},
        "title": "InputNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "InputNodeOutput",
        "type": "object"
      },
      "config": {
        "properties": {
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
            "default": {
              "response": "str"
            },
            "title": "Output Schema",
            "type": "object"
          }
        },
        "required": [
          "input_schema"
        ],
        "title": "InputNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "IN",
        "color": "#F4C1FF"
      }
    },
    {
      "name": "StaticValueNode",
      "input": {
        "properties": {},
        "title": "StaticValueNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {},
        "title": "StaticValueNodeOutput",
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
        "title": "StaticValueNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "CVN",
        "color": "#E8FFC1"
      }
    }
  ],
  "llm": [
    {
      "name": "SingleLLMCallNode",
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
        "title": "SingleLLMCallNodeInput",
        "type": "object"
      },
      "output": {
        "properties": {
          "response": {
            "title": "Response",
            "type": "string"
          }
        },
        "required": [
          "response"
        ],
        "title": "SingleLLMCallNodeOutput",
        "type": "object"
      },
      "config": {
        "$defs": {
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
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
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "response": "str"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
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
        "title": "SingleLLMCallNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "SLCN",
        "color": "#C1FFEC"
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
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "title": "System Prompt",
            "type": "string"
          },
          "num_simulations": {
            "default": 10,
            "description": "Number of simulations to run",
            "maximum": 100,
            "minimum": 1,
            "title": "Num Simulations",
            "type": "integer"
          },
          "simulation_depth": {
            "default": 5,
            "description": "Simulation depth",
            "maximum": 10,
            "minimum": 1,
            "title": "Simulation Depth",
            "type": "integer"
          },
          "exploration_weight": {
            "default": 1.4,
            "description": "Exploration weight",
            "maximum": 2,
            "minimum": 0,
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
          "system_prompt"
        ],
        "title": "MCTSNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "MN",
        "color": "#FFD3C1"
      }
    },
    {
      "name": "BestOfNNode",
      "input": {},
      "output": {},
      "config": {
        "$defs": {
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
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
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "response": "str"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
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
          },
          "samples": {
            "default": 3,
            "description": "Number of samples to generate",
            "maximum": 10,
            "minimum": 1,
            "title": "Samples",
            "type": "integer"
          },
          "rating_prompt": {
            "default": "Rate the following response on a scale from 0 to 10, where 0 is poor and 10 is excellent. Consider factors such as relevance, coherence, and helpfulness. Respond with only a number.",
            "description": "The prompt for the rating LLM",
            "title": "Rating Prompt",
            "type": "string"
          },
          "rating_temperature": {
            "default": 0.1,
            "description": "Temperature for randomness, between 0.0 and 1.0",
            "maximum": 2,
            "minimum": 0,
            "title": "Rating Temperature",
            "type": "number"
          },
          "rating_max_tokens": {
            "default": 16,
            "description": "Number of tokens, between 1 and 4096",
            "maximum": 4096,
            "minimum": 1,
            "title": "Rating Max Tokens",
            "type": "integer"
          }
        },
        "title": "BestOfNNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "BONN",
        "color": "#C1C1FF"
      }
    },
    {
      "name": "BranchSolveMergeNode",
      "input": {},
      "output": {},
      "config": {
        "$defs": {
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
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
          "output_schema": {
            "additionalProperties": {
              "type": "string"
            },
            "default": {
              "response": "str"
            },
            "title": "Output Schema",
            "type": "object"
          },
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
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
          },
          "branch_prompt": {
            "default": "Please decompose the following task into multiple subtasks.",
            "description": "The prompt for the branch LLM",
            "title": "Branch Prompt",
            "type": "string"
          },
          "solve_prompt": {
            "default": "Please provide a detailed solution for the following subtask:",
            "description": "The prompt for the solve LLM",
            "title": "Solve Prompt",
            "type": "string"
          },
          "merge_prompt": {
            "default": "Please combine the following solutions into a coherent and comprehensive final answer.",
            "title": "Merge Prompt",
            "type": "string"
          }
        },
        "title": "BranchSolveMergeNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "BSMN",
        "color": "#C1FFD1"
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
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
            "title": "System Prompt",
            "type": "string"
          },
          "json_mode": {
            "default": false,
            "description": "Whether to use JSON mode for the LLM",
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
        "title": "MixtureOfAgentsNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "MOAN",
        "color": "#C1C1FF"
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
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
            "title": "System Prompt",
            "type": "string"
          },
          "json_mode": {
            "default": false,
            "description": "Whether to use JSON mode for the LLM",
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
            "description": "Number of samples to generate",
            "maximum": 10,
            "minimum": 1,
            "title": "Samples",
            "type": "integer"
          },
          "similarity_threshold": {
            "default": 0.8,
            "description": "Similarity threshold",
            "maximum": 1,
            "minimum": 0,
            "title": "Similarity Threshold",
            "type": "number"
          }
        },
        "title": "SelfConsistencyNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "SCN",
        "color": "#F4C1FF"
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
          "ModelInfo": {
            "properties": {
              "name": {
                "title": "Name",
                "type": "string"
              },
              "max_tokens": {
                "anyOf": [
                  {
                    "minimum": 1,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Maximum number of tokens the model can generate",
                "title": "Max Tokens"
              },
              "temperature": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 0.7,
                "description": "Temperature for randomness, between 0.0 and 1.0",
                "title": "Temperature"
              },
              "top_p": {
                "anyOf": [
                  {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "default": 1,
                "description": "Top-p sampling value, between 0.0 and 1.0",
                "title": "Top P"
              }
            },
            "required": [
              "name",
              "max_tokens"
            ],
            "title": "ModelInfo",
            "type": "object"
          }
        },
        "properties": {
          "llm_info": {
            "$ref": "#/$defs/ModelInfo",
            "default": {
              "name": "gpt-4o",
              "max_tokens": 16384,
              "temperature": 0.7,
              "top_p": 1
            },
            "description": "The default LLM model to use"
          },
          "system_prompt": {
            "default": "You are a helpful assistant.",
            "description": "The system prompt for the LLM",
            "title": "System Prompt",
            "type": "string"
          },
          "json_mode": {
            "default": false,
            "description": "Whether to use JSON mode for the LLM",
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
            "description": "Number of steps to run",
            "maximum": 10,
            "minimum": 1,
            "title": "Steps",
            "type": "integer"
          },
          "n_generate_sample": {
            "default": 1,
            "description": "Number of samples to generate",
            "maximum": 10,
            "minimum": 1,
            "title": "N Generate Sample",
            "type": "integer"
          },
          "n_evaluate_sample": {
            "default": 1,
            "description": "Number of samples to evaluate",
            "maximum": 10,
            "minimum": 1,
            "title": "N Evaluate Sample",
            "type": "integer"
          },
          "n_select_sample": {
            "default": 1,
            "description": "Number of samples to select",
            "maximum": 10,
            "minimum": 1,
            "title": "N Select Sample",
            "type": "integer"
          },
          "method_generate": {
            "default": "sample",
            "description": "Generation method",
            "title": "Method Generate",
            "type": "string"
          },
          "method_evaluate": {
            "default": "value",
            "description": "Evaluation method",
            "title": "Method Evaluate",
            "type": "string"
          },
          "method_select": {
            "default": "greedy",
            "description": "Selection method",
            "title": "Method Select",
            "type": "string"
          },
          "prompt_sample": {
            "default": "standard",
            "description": "Prompt sample",
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
            "description": "Search method",
            "title": "Search Method",
            "type": "string"
          }
        },
        "title": "TreeOfThoughtsNodeConfig",
        "type": "object"
      },
      "visual_tag": {
        "acronym": "TOTN",
        "color": "#E8FFC1"
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
      },
      "visual_tag": {
        "acronym": "PFN",
        "color": "#FFC1EC"
      }
    }
  ]
}