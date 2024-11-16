// frontend/src/utils/JSPydanticModel.ts

interface SchemaProperty {
  type?: string;
  title?: string;
  default?: any;
  $ref?: string;
  anyOf?: any[];
  properties?: { [key: string]: SchemaProperty };
  required?: string[];
  additionalProperties?: SchemaProperty | boolean;
  items?: SchemaProperty; // For handling arrays
  description?: string;
  enum?: any[];
  constraints?: {
    minimum?: number;
    maximum?: number;
    minItems?: number;
    maxItems?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    minProperties?: number;
    maxProperties?: number;
    required?: boolean;
    // Add any other constraints you need
  };
}

interface JSONSchema {
  [key: string]: any; // Allow any keys at the root level
  properties?: { [key: string]: SchemaProperty };
  required?: string[];
  $defs?: { [key: string]: JSONSchema }; // For handling $defs in the schema
}

class JSPydanticModel {
  [key: string]: any;
  private _schema: JSONSchema;
  private _constraints: { [key: string]: any } = {};

  constructor(schema: JSONSchema) {
    this._schema = schema;
    this._constraints = {};
    this.createObjectFromSchema();
  }

  public createObjectFromSchema(): any {
    // Start processing from the root of the schema
    return this.processSchema(this._schema, new Set());
  }

  private processSchema(
    schema: any,
    refsSeen: Set<string> = new Set(),
    path: string[] = []
  ): any {
    if (schema === null || schema === undefined) {
      return null;
    }

    if (typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item, index) =>
        this.processSchema(item, refsSeen, [...path, index.toString()]));
    }

    // Process $defs if present
    if (schema.$defs) {
      this.processDefs(schema.$defs);
    }

    // Handle $ref resolution
    if (schema.$ref) {
      const refPath = schema.$ref;
      if (refsSeen.has(refPath)) {
        return {};
      }
      refsSeen.add(refPath);

      const refSchema = this.resolveRef(refPath);
      if (!refSchema) {
        return null;
      }

      const mergedSchema = { ...refSchema, ...schema };
      delete mergedSchema.$ref;

      const result = this.processSchema(mergedSchema, refsSeen, path);
      refsSeen.delete(refPath);
      return result;
    }

    // Extract constraints
    const constraintKeys = [
      'minimum', 'maximum', 'minItems', 'maxItems',
      'minLength', 'maxLength', 'pattern',
      'exclusiveMinimum', 'exclusiveMaximum',
      'minProperties', 'maxProperties'
    ];

    const constraints: any = {};
    for (const key of constraintKeys) {
      if (schema[key] !== undefined) {
        constraints[key] = schema[key];
      }
    }

    // Store constraints with simplified path
    if (Object.keys(constraints).length > 0) {
      let propertyName = '';
      for (let i = path.length - 1; i >= 0; i--) {
        if (path[i] !== 'properties' && path[i] !== 'anyOf' && !path[i].match(/^\d+$/)) {
          propertyName = path[i];
          break;
        }
      }
      if (propertyName) {
        this._constraints[propertyName] = constraints;
      }
    }

    // Handle config simplification
    if (path.join('.').includes('config')) {
      if (schema.properties) {
        const result: any = {};

        // Handle input_schema and output_schema
        if (schema.properties.input_schema) {
          result.input_schema = schema.properties.input_schema.default || {};
        }
        if (schema.properties.output_schema) {
          result.output_schema = schema.properties.output_schema.default || {};
        }

        // Handle llm_info
        if (schema.properties.llm_info) {
          result.llm_info = schema.properties.llm_info.default || {};
        }

        // Handle system_prompt
        if (schema.properties.system_prompt) {
          result.system_prompt = schema.properties.system_prompt.default || "";
        }

        // Handle few_shot_examples
        if (schema.properties.few_shot_examples) {
          result.few_shot_examples = schema.properties.few_shot_examples.default || null;
        }

        return result;
      }
      return schema.default || schema;
    }

    // Handle anyOf
    if (schema.anyOf) {
      const processedAnyOf = schema.anyOf.map((option: any, index: number) =>
        this.processSchema(option, refsSeen, [...path, 'anyOf', index.toString()]));
      const validOption = processedAnyOf.find(opt => opt !== null);
      return validOption || null;
    }

    // Process regular object properties
    const result: any = {};
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        if (key === 'properties') {
          result[key] = {};
          for (const propKey in schema[key]) {
            const newPath = [...path, 'properties', propKey];
            result[key][propKey] = this.processSchema(
              schema[key][propKey],
              refsSeen,
              newPath
            );
          }
        } else if (typeof schema[key] === 'object' && schema[key] !== null) {
          result[key] = this.processSchema(
            schema[key],
            refsSeen,
            [...path, key]
          );
        } else {
          result[key] = schema[key];
        }
      }
    }

    // Add constraints at root level for node definitions
    if (path.length === 2 && path[0] === 'llm') {
      if (Object.keys(this._constraints).length > 0) {
        result.constraints = this._constraints;
        this._constraints = {};
      }
    }

    return result;
  }

  private processDefs(defs: { [key: string]: any }) {
    // Process each definition in $defs
    for (const defKey in defs) {
      if (defs.hasOwnProperty(defKey)) {
        const defSchema = defs[defKey];
        this.processSchema(defSchema, new Set());
      }
    }
  }

  private processObject(schema: any, refsSeen: Set<string>): any {
    const obj: { [key: string]: any } = {};

    // Extract constraints into a dedicated object
    const constraints: any = {};
    const constraintKeys = ['minimum', 'maximum', 'minProperties', 'maxProperties'];
    for (const constraintKey of constraintKeys) {
      if (schema[constraintKey] !== undefined) {
        constraints[constraintKey] = schema[constraintKey];
      }
    }

    // If there are constraints, add them to the schema
    if (Object.keys(constraints).length > 0) {
      schema.constraints = constraints;
    }

    if (schema.properties) {
      for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
          const propertySchema = schema.properties[key];
          const value = this.processSchema(propertySchema, refsSeen);
          obj[key] = propertySchema.default !== undefined ? propertySchema.default : value;
        }
      }
    }

    return schema.default !== undefined ? schema.default : obj;
  }



  private getDefaultForType(type: string): any {
    switch (type) {
      case 'string': return '';
      case 'number':
      case 'integer': return 0;
      case 'boolean': return false;
      default: return null;
    }
  }

  private processEnum(schema: any): any {
    // Store enum values directly in schema
    if (schema.enum) {
      schema.enum = schema.enum;
    }
    schema.type = 'enum';

    return schema.default !== undefined ? schema.default :
      (schema.enum && schema.enum.length > 0 ? schema.enum[0] : null);
  }

  private processAnyOf(anyOf: any[], refsSeen: Set<string>): any {
    // Instead of storing all options in anyOf, we will prune and return the first valid schema
    for (const option of anyOf) {
      const result = this.processSchema(option, refsSeen);

      if (result !== null && result !== undefined) {
        return result; // Return the first valid schema
      }
    }
    return null; // If no valid schema is found, return null
  }

  private resolveRef(ref: string): any {
    const cleanRef = ref.split('#/').pop(); // Remove starting '#/' if present
    const path = cleanRef ? cleanRef.split('/') : [];
    let schema: any = this._schema;
    for (const part of path) {
      if (schema[part]) {
        schema = schema[part];
      } else {
        // Reference not found
        return null;
      }
    }
    return schema;
  }

  private inferTypeFromValue(value: any): string {
    if (value === null) {
      return 'null';
    } else if (Array.isArray(value)) {
      return 'array';
    } else if (typeof value === 'object') {
      return 'object';
    } else {
      return typeof value;
    }
  }
}

export default JSPydanticModel;
