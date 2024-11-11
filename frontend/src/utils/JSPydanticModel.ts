// DynamicModel.ts
interface SchemaProperty {
  type: string;
  default?: any;
}

interface JSONSchema {
  properties: { [key: string]: SchemaProperty };
  required?: string[];
  title?: string;
  type?: string;
}

class JSPydanticModel {
  [key: string]: any; // Allow dynamic properties

  private schema: JSONSchema;

  constructor(schema: JSONSchema) {
    this.schema = schema;
    this.initializeProperties();
  }

  private initializeProperties() {
    const initialState = this.processProperties(this.schema.properties, this.schema.required || [], this.schema);
    // Assign the processed properties to the instance
    Object.assign(this, initialState);
  }

  private processProperties(properties: { [key: string]: SchemaProperty }, required: string[], schema: JSONSchema): any {
    const state: { [key: string]: any } = {};
    for (const key in properties) {
      const property = properties[key];
      const isRequired = required.includes(key);

      // Handle $ref by resolving it from the schema's $defs
      if (property['$ref']) {
        const refPath = property['$ref'].replace('#/', '').split('/');
        const refSchema = this.resolveRef(refPath, schema);
        state[key] = this.processProperties(refSchema.properties, refSchema.required || [], schema);
      } else if (property.type === 'object' && property.properties) {
        // Recursively process nested properties
        state[key] = this.processProperties(property.properties, property.required || [], schema);
      } else if (property['anyOf']) {
        // Handle anyOf by selecting the first valid option (for simplicity)
        state[key] = this.processAnyOf(property['anyOf'], schema);
      } else {
        // Set default value or null if not provided, and ensure required fields are handled
        state[key] = property.default !== undefined ? property.default : (isRequired ? null : undefined);
      }
    }
    return state;
  }

  private resolveRef(refPath: string[], schema: JSONSchema): any {
    let refSchema = schema;
    for (const part of refPath) {
      refSchema = refSchema[part];
    }
    return refSchema;
  }

  private processAnyOf(anyOf: any[], schema: JSONSchema): any {
    for (const option of anyOf) {
      if (option['$ref']) {
        const refPath = option['$ref'].replace('#/', '').split('/');
        const refSchema = this.resolveRef(refPath, schema);
        return this.processProperties(refSchema.properties, refSchema.required || [], schema);
      } else if (option.type) {
        // Handle basic types (string, number, etc.)
        return option.default !== undefined ? option.default : null;
      }
    }
    return null;
  }

  private validateType(value: any, expectedType: string): boolean {
    // Basic type validation
    if (expectedType === 'string') {
      return typeof value === 'string';
    } else if (expectedType === 'number') {
      return typeof value === 'number';
    } else if (expectedType === 'boolean') {
      return typeof value === 'boolean';
    } else if (expectedType === 'array') {
      return Array.isArray(value);
    } else if (expectedType === 'object') {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    // Extend with more types as needed
    return true;
  }
}

export default JSPydanticModel;
