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
  private constraints: { [key: string]: any } = {}; // Initialize constraints

  constructor(schema: JSONSchema) {
    this._schema = schema;
    this.createObjectFromSchema();
  }

  public createObjectFromSchema(): any {
    // Start processing from the root of the schema
    return this.processSchema(this._schema, new Set(), this.constraints);
  }

  private processSchema(
    schema: any,
    refsSeen: Set<string> = new Set(),
    currentConstraints: any = {}
  ): any {
    if (schema === null || schema === undefined) {
      return null;
    }

    if (typeof schema !== 'object') {
      // Primitive value (string, number, boolean, null), return as-is
      return schema;
    }

    if (Array.isArray(schema)) {
      const arr = [];
      for (let i = 0; i < schema.length; i++) {
        // Initialize constraints for this item
        currentConstraints[i] = {};

        const item = this.processSchema(schema[i], refsSeen, currentConstraints[i]);
        arr.push(item);
      }
      return arr;
    }

    // Process $defs if present
    if (schema.$defs) {
      this.processDefs(schema.$defs, currentConstraints, currentConstraints);
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

      const result = this.processSchema(mergedSchema, refsSeen, currentConstraints);

      refsSeen.delete(refPath); // Clean up after processing
      return result;
    }

    if (schema.anyOf) {
      return this.processAnyOf(schema.anyOf, refsSeen, currentConstraints);
    }

    if (schema.enum) {
      return this.processEnum(schema, refsSeen, currentConstraints);
    }

    if (schema.type) {
      switch (schema.type) {
        case 'object':
          return this.processObject(schema, refsSeen, currentConstraints);

        case 'array':
          return this.processArray(schema, refsSeen, currentConstraints);

        case 'string':
        case 'number':
        case 'integer':
        case 'boolean':
          return this.processPrimitive(schema, currentConstraints);

        default:
          return null;
      }
    }

    // Fallback: process properties recursively
    const result: { [key: string]: any } = {};
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        currentConstraints[key] = {};

        result[key] = this.processSchema(schema[key], refsSeen, currentConstraints[key]);
      }
    }
    return result;
  }

  private processDefs(defs: { [key: string]: any }, currentConstraints: any, parentConstraints: any) {
    // Process each definition in $defs
    for (const defKey in defs) {
      if (defs.hasOwnProperty(defKey)) {
        const defSchema = defs[defKey];
        // Process the definition schema and store it in the constraints
        currentConstraints[defKey] = {};
        this.processSchema(defSchema, new Set(), currentConstraints[defKey]);

        // Move the definition directly under the parent constraints instead of $defs
        if (parentConstraints) {
          parentConstraints[defKey] = currentConstraints[defKey];
        }
      }
    }
  }

  private processObject(schema: any, refsSeen: Set<string>, currentConstraints: any): any {
    const obj: { [key: string]: any } = {};

    // Collect object-level constraints first
    const constraintKeys = ['minimum', 'maximum', 'minProperties', 'maxProperties'];
    for (const constraintKey of constraintKeys) {
      if (schema[constraintKey] !== undefined) {
        currentConstraints[constraintKey] = schema[constraintKey];
      }
    }

    if (schema.properties) {
      for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
          const propertySchema = schema.properties[key];

          // Initialize constraints for this property
          currentConstraints[key] = {};

          // Process the property's schema
          const value = this.processSchema(propertySchema, refsSeen, currentConstraints[key]);

          // Use the default value if available, otherwise use the processed value
          obj[key] = propertySchema.default !== undefined ? propertySchema.default : value;

          // If the processed value is empty but we have constraints, keep the constraints
          if (Object.keys(currentConstraints[key]).length === 0 && propertySchema.type) {
            currentConstraints[key].type = propertySchema.type;
          }
        }
      }
    }

    // If schema has a default value, use it
    if (schema.default !== undefined) {
      return schema.default;
    }

    return obj;
  }

  private processArray(schema: any, refsSeen: Set<string>, currentConstraints: any): any {
    // Collect array-level constraints
    const constraintKeys = ['minItems', 'maxItems'];
    for (const constraintKey of constraintKeys) {
      if (schema[constraintKey] !== undefined) {
        currentConstraints[constraintKey] = schema[constraintKey];
      }
    }

    // If schema has items definition
    if (schema.items) {
      currentConstraints.items = {};
      const processedItems = this.processSchema(schema.items, refsSeen, currentConstraints.items);

      // If schema has a default value, use it
      if (schema.default !== undefined) {
        return schema.default;
      }

      // Return an empty array as default
      return [];
    }

    return schema.default !== undefined ? schema.default : [];
  }

  private processPrimitive(schema: any, currentConstraints: any): any {
    // Collect primitive-level constraints
    const constraintKeys = [
      'minimum',
      'maximum',
      'exclusiveMinimum',
      'exclusiveMaximum',
      'minLength',
      'maxLength',
      'pattern',
      'enum',
      'type'
    ];

    for (const constraintKey of constraintKeys) {
      if (schema[constraintKey] !== undefined) {
        currentConstraints[constraintKey] = schema[constraintKey];
      }
    }

    // If schema has a default value, use it
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Return type-appropriate default value
    switch (schema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      default:
        return null;
    }
  }

  private processEnum(schema: any, refsSeen: Set<string>, currentConstraints: any): any {
    // Store enum values in constraints
    if (schema.enum) {
      currentConstraints.enum = schema.enum;
    }

    // Store type information
    currentConstraints.type = 'enum';

    // If schema has a default value, use it
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Return first enum value as default, or null if no enum values
    return schema.enum && schema.enum.length > 0 ? schema.enum[0] : null;
  }

  private processAnyOf(anyOf: any[], refsSeen: Set<string>, currentConstraints: any): any {
    // Instead of storing all options in anyOf, we will prune and return the first valid schema
    for (const option of anyOf) {
      const optionConstraints = {};
      const result = this.processSchema(option, refsSeen, optionConstraints);

      if (result !== null && result !== undefined) {
        // Merge the constraints of the first valid option into the current constraints
        Object.assign(currentConstraints, optionConstraints);
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
