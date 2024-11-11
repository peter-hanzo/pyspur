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

  constructor(schema: JSONSchema) {
    this._schema = schema;
    this.initializeProperties();
  }

  private initializeProperties() {
    // Process each key at the root of the schema
    for (const key in this._schema) {
      if (this._schema.hasOwnProperty(key)) {
        this[key] = this.processSchema(this._schema[key]);
      }
    }
  }

  private processSchema(
    schema: any,
    refsSeen: Set<string> = new Set()
  ): any {
    if (schema === null || schema === undefined) {
      return null;
    }

    if (typeof schema !== 'object') {
      // Primitive value (string, number, boolean, null), return as-is
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => this.processSchema(item, refsSeen));
    }

    if (schema.$ref) {
      const refPath = schema.$ref;
      if (refsSeen.has(refPath)) {
        // Circular reference detected
        return {}; // Return an empty object or handle appropriately
      }
      refsSeen.add(refPath);

      const refSchema = this.resolveRef(refPath);
      if (!refSchema) {
        return null; // Unable to resolve reference
      }

      // Merge the schemas, giving precedence to properties in 'schema'
      const mergedSchema = { ...refSchema, ...schema };
      delete mergedSchema.$ref; // Prevent re-processing $ref

      const result = this.processSchema(mergedSchema, refsSeen);

      refsSeen.delete(refPath); // Clean up after processing
      return result;
    }

    if (schema.anyOf) {
      return this.processAnyOf(schema.anyOf, refsSeen);
    }

    if (schema.enum) {
      return this.processEnum(schema, refsSeen);
    }

    if (schema.type) {
      switch (schema.type) {
        case 'object':
          return this.processObject(schema, refsSeen);

        case 'array':
          return this.processArray(schema, refsSeen);

        case 'string':
        case 'number':
        case 'integer':
        case 'boolean':
          return this.processPrimitive(schema);

        default:
          return null;
      }
    }

    // Fallback: process properties recursively
    const result: { [key: string]: any } = {};
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        result[key] = this.processSchema(schema[key], refsSeen);
      }
    }
    return result;
  }

  private processObject(schema: any, refsSeen: Set<string>): any {
    const obj: { [key: string]: any } = {};

    if (schema.properties) {
      for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
          const propertySchema = schema.properties[key];

          // Process the property's schema
          const value = this.processSchema(propertySchema, refsSeen);

          // Use the default value if available, otherwise use the processed value
          obj[key] =
            propertySchema.default !== undefined ? propertySchema.default : value;
        }
      }
    }

    // Handle additionalProperties if necessary
    if (schema.additionalProperties === true) {
      // Assuming you want to allow additional properties as empty objects
      // obj['additionalProperties'] = {};
    }

    // If the object itself has a default, merge it
    if (schema.default && typeof schema.default === 'object') {
      Object.assign(obj, schema.default);
    }

    return obj;
  }

  private processArray(schema: any, refsSeen: Set<string>): any {
    const arr: any = {};

    // Include metadata
    if (schema.title) {
      arr['title'] = schema.title;
    }
    if (schema.description) {
      arr['description'] = schema.description;
    }
    arr['type'] = 'array';

    // Process items
    if (schema.items) {
      arr['items'] = this.processSchema(schema.items, refsSeen);
    } else {
      arr['items'] = {};
    }

    // Assign default value
    if (schema.default !== undefined) {
      arr['default'] = schema.default;
    } else {
      arr['default'] = [];
    }

    return arr;
  }

  private processPrimitive(schema: any): any {
    const result: any = {};

    // Include metadata
    if (schema.title) {
      result['title'] = schema.title;
    }
    if (schema.description) {
      result['description'] = schema.description;
    }
    result['type'] = schema.type;

    // Assign default value
    if (schema.default !== undefined) {
      result['default'] = schema.default;
    } else {
      // Assign sensible defaults based on type
      switch (schema.type) {
        case 'string':
          result['default'] = '';
          break;
        case 'number':
        case 'integer':
          result['default'] = 0;
          break;
        case 'boolean':
          result['default'] = false;
          break;
        default:
          result['default'] = null;
      }
    }

    return result;
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

  private processAnyOf(anyOf: any[], refsSeen: Set<string>): any {
    for (const option of anyOf) {
      const result = this.processSchema(option, refsSeen);
      if (result !== null && result !== undefined) {
        return result;
      }
    }
    return null;
  }

  private processEnum(schema: any): any {
    const result: any = {};

    // Include metadata
    if (schema.title) {
      result['title'] = schema.title;
    }
    if (schema.description) {
      result['description'] = schema.description;
    }
    result['type'] = 'enum';

    // Assign default value
    if (schema.default !== undefined) {
      result['default'] = schema.default;
    } else if (schema.enum && schema.enum.length > 0) {
      result['default'] = schema.enum[0];
    } else {
      result['default'] = null;
    }

    result['enum'] = schema.enum || [];

    return result;
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

  public createObjectFromSchema(): any {
    return this.processSchema(this._schema);
  }
}

export default JSPydanticModel;
