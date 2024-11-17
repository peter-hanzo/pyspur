// frontend/src/utils/JSPydanticModel.js

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class JSPydanticModel {
  constructor(schema) {
    this._schema = schema;
    this._constraints = {};
    this._metadata = {
      primitives: [],
      llm: [],
      python: [],
      $defs: {}
    };

    this.ajv = new Ajv({
      useDefaults: true,
      coerceTypes: true,
      removeAdditional: true,
      allErrors: true,
    });

    addFormats(this.ajv);
    this.extractMetadata(this._schema);
  }

  createObjectFromSchema() {
    // Handle node types schema (primitives/llm/python)
    if (this._schema.primitives || this._schema.llm || this._schema.python) {
      return this.processNodeTypesSchema(this._schema);
    }

    // Handle regular JSON schemas
    try {
      const validate = this.ajv.compile(this._schema);
      const obj = {};
      validate(obj);
      this.extractConstraints(this._schema);
      return obj;
    } catch (error) {
      console.error('Error compiling schema:', error);
      return null;
    }
  }

  processNodeTypesSchema(schema) {
    const result = {};

    ['primitives', 'llm', 'python'].forEach(category => {
      if (schema[category]) {
        result[category] = schema[category].map(node => {
          const processedNode = { ...node };

          // Process schemas for input, output, and config
          ['input', 'output', 'config'].forEach(key => {
            if (node[key]) {
              try {
                const validator = this.ajv.compile(node[key]);
                const obj = {};
                validator(obj);
                processedNode[key] = obj;
              } catch (error) {
                console.error(`Error processing ${key} schema for node:`, error);
                processedNode[key] = {};
              }
            }
          });

          return processedNode;
        });
      }
    });

    return result;
  }

  extractConstraints(schema, path = []) {
    const constraintKeys = [
      'minimum', 'maximum', 'minItems', 'maxItems',
      'minLength', 'maxLength', 'pattern',
      'exclusiveMinimum', 'exclusiveMaximum',
      'minProperties', 'maxProperties',
      'type', 'enum'
    ];

    // Get constraints at current level
    const constraints = constraintKeys.reduce((acc, key) => {
      if (schema[key] !== undefined) {
        acc[key] = schema[key];
      }
      return acc;
    }, {});
    // Store constraints if found
    if (Object.keys(constraints).length > 0) {
      const propertyName = path.join('.');
      if (propertyName) {
        this._constraints[propertyName] = constraints;
      }
    }

    // Handle $ref to definitions
    if (schema.$ref) {
      const refPath = schema.$ref.replace(/^#\//, '').split('/');
      let refSchema = this._schema;

      // Special handling for $defs references
      if (refPath[0] === '$defs') {
        // If the reference is to a $defs definition, look in the current context
        const currentContext = this.findContextWithDefs(schema);
        if (currentContext && currentContext.$defs) {
          refSchema = currentContext.$defs[refPath[1]];
        }
      } else {
        // For other references, traverse the path
        for (const part of refPath) {
          if (refSchema && typeof refSchema === 'object') {
            refSchema = refSchema[part];
          } else {
            console.warn(`Unable to resolve reference path: ${schema.$ref}`);
            return;
          }
        }
      }

      if (refSchema) {
        // Process the referenced schema with the same path
        this.extractConstraints(refSchema, path);
      }
      return; // Stop processing this branch after handling $ref
    }

    // Process nested properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        this.extractConstraints(value, [...path, key]);
      });
    } else if (schema.anyOf || schema.oneOf || schema.allOf) {
      const schemas = schema.anyOf || schema.oneOf || schema.allOf;
      schemas.forEach(subSchema => {
        this.extractConstraints(subSchema, path);
      });
    }

    // Process array items
    if (schema.items) {
      this.extractConstraints(schema.items, [...path, 'items']);
    }
  }

  getConstraints() {
    return this._constraints;
  }

  extractMetadata(schema, path = []) {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    const metadataKeys = [
      'type', 'title', 'description', 'default',
      'minimum', 'maximum', 'minItems', 'maxItems',
      'minLength', 'maxLength', 'pattern', 'enum',
      'required', 'additionalProperties'
    ];

    // Get metadata at current level
    const metadata = metadataKeys.reduce((acc, key) => {
      if (schema[key] !== undefined) {
        acc[key] = schema[key];
      }
      return acc;
    }, {});

    // Store metadata in nested structure
    if (Object.keys(metadata).length > 0) {
      this.setNestedMetadata(path, metadata);
    }

    // Handle root-level arrays (primitives, llm, python)
    ['primitives', 'llm', 'python'].forEach(category => {
      if (Array.isArray(schema[category])) {
        if (!this._metadata[category]) {
          this._metadata[category] = [];
        }

        schema[category].forEach((node, index) => {
          if (!this._metadata[category][index]) {
            this._metadata[category][index] = {
              input: {},
              output: {},
              config: {}
            };
          }

          ['input', 'output', 'config'].forEach(schemaType => {
            if (node[schemaType]) {
              const newPath = [category, index, schemaType];
              this.extractMetadata(node[schemaType], newPath);

              if (node[schemaType].properties) {
                Object.entries(node[schemaType].properties).forEach(([key, value]) => {
                  this.extractMetadata(value, [...newPath, 'properties', key]);
                });
              }
            }
          });
        });
      }
    });

    // Handle $ref to definitions
    if (schema.$ref) {
      const refPath = schema.$ref.replace(/^#\//, '').split('/');
      let refSchema = this._schema;

      // Special handling for $defs references
      if (refPath[0] === '$defs') {
        const currentContext = this.findContextWithDefs(schema);
        if (currentContext && currentContext.$defs) {
          refSchema = currentContext.$defs[refPath[1]];
          if (refSchema) {
            this.extractMetadata(refSchema, ['$defs', refPath[1]]);
          }
        }
      } else {
        for (const part of refPath) {
          if (refSchema && typeof refSchema === 'object') {
            refSchema = refSchema[part];
          }
        }
        if (refSchema) {
          this.extractMetadata(refSchema, path);
        }
      }
      return;
    }

    // Process nested properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        this.extractMetadata(value, [...path, 'properties', key]);
      });
    }

    // Process array items
    if (schema.items) {
      this.extractMetadata(schema.items, [...path, 'items']);
    }

    // Process anyOf, oneOf, allOf
    ['anyOf', 'oneOf', 'allOf'].forEach(key => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((subSchema, index) => {
          this.extractMetadata(subSchema, [...path, key, index.toString()]);
        });
      }
    });

    // Process additionalProperties if it's an object schema
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      this.extractMetadata(schema.additionalProperties, [...path, 'additionalProperties']);
    }

    // Process $defs or definitions
    if (schema.$defs) {
      Object.entries(schema.$defs).forEach(([key, value]) => {
        this.extractMetadata(value, ['$defs', key]);
      });
    }
  }

  // Helper method to set nested metadata
  setNestedMetadata(path, metadata) {
    if (path.length === 0) return;

    let current = this._metadata;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (Array.isArray(current)) {
        if (!current[key]) {
          current[key] = {};
        }
      } else {
        if (!current[key]) {
          // Check if next key is numeric to determine if we need an array or object
          current[key] = isNaN(path[i + 1]) ? {} : [];
        }
      }
      current = current[key];
    }

    const lastKey = path[path.length - 1];
    if (current[lastKey]) {
      current[lastKey] = { ...current[lastKey], ...metadata };
    } else {
      current[lastKey] = metadata;
    }
  }

  // Update the getter methods to work with nested structure
  getPropertyMetadata(propertyPath) {
    if (!propertyPath) return null;
    const parts = propertyPath.split('.');
    let current = this._metadata;

    for (const part of parts) {
      if (!current || !current[part]) return null;
      current = current[part];
    }

    return current;
  }

  getAllMetadata() {
    return this._metadata;
  }

  getPropertyDefault(propertyPath) {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.default;
  }

  getPropertyType(propertyPath) {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.type;
  }

  getPropertyConstraints(propertyPath) {
    const metadata = this.getPropertyMetadata(propertyPath);
    if (!metadata) return {};

    return {
      minimum: metadata.minimum,
      maximum: metadata.maximum,
      minItems: metadata.minItems,
      maxItems: metadata.maxItems,
      minLength: metadata.minLength,
      maxLength: metadata.maxLength,
      pattern: metadata.pattern,
      required: metadata.required,
    };
  }

  isPropertyRequired(propertyPath) {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.required || false;
  }

  getPropertyEnum(propertyPath) {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.enum;
  }

  findContextWithDefs(schema) {
    // Start with the immediate parent context
    let context = schema;

    // Keep looking up until we find a context with $defs or reach the root
    while (context && !context.$defs) {
      if (context === this._schema) {
        break;
      }
      context = this.findParentContext(context);
    }

    return context || this._schema;
  }

  findParentContext(schema, currentContext = this._schema) {
    if (!currentContext || typeof currentContext !== 'object') {
      return null;
    }

    // Check all properties of the current context
    for (const [key, value] of Object.entries(currentContext)) {
      if (value === schema) {
        return currentContext;
      }
      if (typeof value === 'object') {
        const result = this.findParentContext(schema, value);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }
}

export default JSPydanticModel;
