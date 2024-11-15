// frontend/src/utils/JSPydanticModel.ts

interface SchemaProperty {
  type?: string | string[];
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
  nullable?: boolean; // Added to handle nullable types
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
  private enums: { [key: string]: any[] } = {};

  constructor(schema: JSONSchema) {
    this._schema = schema;
    this.initializeFields(schema);
  }

  private initializeFields(
    schema: JSONSchema,
    parentKey: string = '',
    parentObj: any = this,
    defaultValues: any = {}
  ) {
    const properties = schema.properties || {};
    const requiredFields = new Set(schema.required || []);
    const defaults = this.extractDefaults(schema);

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const fullFieldName = parentKey ? `${parentKey}.${fieldName}` : fieldName;

      // Resolve $ref if present
      const resolvedSchema = this.processSchema(fieldSchema);

      // Determine default value for the field
      let defaultValue =
        defaultValues[fieldName] !== undefined
          ? defaultValues[fieldName]
          : defaults[fieldName];

      // Handle nested objects
      if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
        // Create a new instance of JSPydanticModel for the nested object
        parentObj[fieldName] = new JSPydanticModel(resolvedSchema);

        // Set default values if available
        if (defaultValue !== undefined && typeof defaultValue === 'object') {
          parentObj[fieldName].assignValues(defaultValue);
        }

        continue;
      }

      // Handle arrays
      if (resolvedSchema.type === 'array' && resolvedSchema.items) {
        const itemSchema = resolvedSchema.items;

        Object.defineProperty(parentObj, fieldName, {
          get: () => parentObj[`_${fieldName}`],
          set: (value: any[]) => {
            if (value === null) {
              if (resolvedSchema.nullable) {
                parentObj[`_${fieldName}`] = null;
              } else {
                throw new Error(`Field '${fullFieldName}' cannot be null.`);
              }
            } else if (!Array.isArray(value)) {
              throw new Error(`Field '${fullFieldName}' must be an array.`);
            } else {
              parentObj[`_${fieldName}`] = value.map((item, index) => {
                return this.processValue(
                  itemSchema,
                  item,
                  `${fullFieldName}[${index}]`
                );
              });
            }
          },
          enumerable: true,
        });

        // Set default value if available
        if (defaultValue !== undefined) {
          parentObj[fieldName] = defaultValue;
        } else {
          parentObj[fieldName] = resolvedSchema.nullable ? null : [];
        }
        continue;
      }

      // Store enum options if available
      if (resolvedSchema.enum) {
        this.enums[fullFieldName] = resolvedSchema.enum;
      }

      // Define getters and setters with validation
      Object.defineProperty(parentObj, fieldName, {
        get: () => parentObj[`_${fieldName}`],
        set: (value: any) => {
          if (value === null) {
            if (resolvedSchema.nullable) {
              parentObj[`_${fieldName}`] = null;
            } else {
              throw new Error(`Field '${fullFieldName}' cannot be null.`);
            }
          } else if (value === undefined) {
            // Do nothing
          } else if (this.enums[fullFieldName]) {
            // Validate enum values
            if (!this.enums[fullFieldName].includes(value)) {
              // throw new Error(
              //   `Invalid value '${JSON.stringify(value)}' for field '${fullFieldName}'. Allowed values are: ${this.enums[fullFieldName].join(
              //     ', '
              //   )}.`
              // );
            } else {
              parentObj[`_${fieldName}`] = value;
            }
          } else {
            parentObj[`_${fieldName}`] = this.processValue(
              resolvedSchema,
              value,
              fullFieldName
            );
          }
        },
        enumerable: true,
      });

      // Assign the default value
      if (defaultValue !== undefined) {
        parentObj[fieldName] = defaultValue;
      } else if (!requiredFields.has(fieldName)) {
        parentObj[fieldName] = resolvedSchema.nullable ? null : undefined;
      }
    }
  }

  // New method to assign values to the model, including nested models
  public assignValues(values: any) {
    for (const key of Object.keys(values)) {
      if (this.hasOwnProperty(key)) {
        if (
          this[key] instanceof JSPydanticModel &&
          typeof values[key] === 'object'
        ) {
          // Recursively assign values to nested JSPydanticModel
          this[key].assignValues(values[key]);
        } else {
          this[key] = values[key];
        }
      }
    }
  }

  private processSchema(
    schema: SchemaProperty,
    refsSeen: Set<string> = new Set()
  ): SchemaProperty {
    if (schema === null || schema === undefined) {
      return {};
    }

    if (typeof schema !== 'object') {
      return {};
    }

    if (schema.$ref) {
      const refPath = schema.$ref;
      if (refsSeen.has(refPath)) {
        // Circular reference detected
        return {};
      }
      refsSeen.add(refPath);

      const refSchema = this.resolveRef(refPath);
      if (!refSchema) {
        return {};
      }

      // Merge the schemas, giving precedence to properties in 'schema'
      const mergedSchema = { ...refSchema, ...schema };
      delete mergedSchema.$ref; // Prevent re-processing $ref

      const result = this.processSchema(mergedSchema, refsSeen);

      refsSeen.delete(refPath);
      return result;
    }

    if (schema.anyOf) {
      // Process 'anyOf' schemas to combine possible types
      const types: (string | string[])[] = [];
      let nullable = false;
      for (const option of schema.anyOf) {
        const processedOption = this.processSchema(option, refsSeen);
        if (processedOption.type) {
          types.push(processedOption.type);
        }
        if (processedOption.type === 'null') {
          nullable = true;
        }
        if (processedOption.nullable) {
          nullable = true;
        }
      }

      const nonNullTypes = types.flat().filter((type) => type !== 'null');

      const resultSchema: SchemaProperty = { ...schema };
      if (nonNullTypes.length === 1) {
        resultSchema.type = nonNullTypes[0];
      } else if (nonNullTypes.length > 1) {
        resultSchema.type = nonNullTypes;
      }

      if (nullable) {
        resultSchema.nullable = true;
      }

      return resultSchema;
    }

    return schema;
  }

  private resolveRef(ref: string): SchemaProperty | null {
    if (ref.startsWith('#/')) {
      const path = ref.slice(2).split('/'); // Removes the leading '#/' and splits the path
      let schema: any = this._schema;
      for (const part of path) {
        if (schema.hasOwnProperty(part)) {
          schema = schema[part];
        } else {
          // Reference not found
          return null;
        }
      }
      return schema;
    } else {
      // Handle external references or other ref formats if necessary
      return null;
    }
  }

  private extractDefaults(schema: JSONSchema): { [key: string]: any } {
    let defaults: { [key: string]: any } = {};
  
    // Handle default at the schema level
    if (schema.hasOwnProperty('default')) {
      return schema.default;
    }
  
    const resolvedSchema = this.processSchema(schema);
  
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
      defaults = {};
      const properties = resolvedSchema.properties || {};
      for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const fieldDefault = this.extractDefaults(fieldSchema);
        if (fieldDefault !== undefined) {
          defaults[fieldName] = fieldDefault;
        }
      }
    } else if (resolvedSchema.type === 'array' && resolvedSchema.items) {
      const itemDefault = this.extractDefaults(resolvedSchema.items);
      if (itemDefault !== undefined && Object.keys(itemDefault).length > 0) {
        defaults = [itemDefault];
      } else {
        defaults = [];
      }
    } else if (resolvedSchema.hasOwnProperty('default')) {
      defaults = resolvedSchema.default;
    }
  
    return defaults;
  }

  public getDefaultValues(): { [key: string]: any } {
    return this.extractDefaults(this._schema);
  }

  private processValue(
    schema: SchemaProperty,
    value: any,
    fieldPath: string
  ): any {
    const resolvedSchema = this.processSchema(schema);

    // Handle nullable values
    if (value === null) {
      if (resolvedSchema.nullable) {
        return null;
      } else {
        throw new Error(`Field '${fieldPath}' cannot be null.`);
      }
    }

    // Handle nested objects
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
      const obj: any = {};
      this.initializeFields(resolvedSchema, fieldPath, obj);
      Object.assign(obj, value);
      return obj;
    }

    // Handle arrays
    if (resolvedSchema.type === 'array' && resolvedSchema.items) {
      if (!Array.isArray(value)) {
        throw new Error(`Field '${fieldPath}' must be an array.`);
      }
      return value.map((item, index) =>
        this.processValue(resolvedSchema.items!, item, `${fieldPath}[${index}]`)
      );
    }

    // Validate enum
    if (resolvedSchema.enum) {
      if (!resolvedSchema.enum.includes(value)) {
        throw new Error(
          `Invalid value '${value}' for field '${fieldPath}'. Allowed values are: ${resolvedSchema.enum.join(
            ', '
          )}.`
        );
      }
    }

    // validate $ref
    if (resolvedSchema.$ref) {
      const refSchema = this.resolveRef(resolvedSchema.$ref);
      if (refSchema) {
        return this.processValue(refSchema, value, fieldPath);
      }
    }


    return value;
  }

  public getSchema(
    schema: JSONSchema = this._schema,
    parentKey: string = '',
    schemaDict: { [key: string]: any } = {}
  ): { [key: string]: any } {
    const properties = schema.properties || {};
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const fullFieldName = parentKey ? `${parentKey}.${fieldName}` : fieldName;
      const resolvedSchema = this.processSchema(fieldSchema);

      if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
        // Recursively process nested objects
        this.getSchema(resolvedSchema, fullFieldName, schemaDict);
      } else if (resolvedSchema.type === 'array' && resolvedSchema.items) {
        // Handle arrays
        const itemSchema = this.processSchema(resolvedSchema.items);

        if (itemSchema.type === 'object' && itemSchema.properties) {
          // For arrays of objects, process the object's properties
          const itemTypes: { [key: string]: any } = {};
          this.getSchema(itemSchema, `${fullFieldName}[]`, itemTypes);
          schemaDict[fullFieldName] = itemTypes;
        } else {
          const itemType = itemSchema.type || 'any';
          schemaDict[fullFieldName] = `Array<${itemType}>`;
        }
      } else {
        // For simple types, add to schemaDict
        const types = Array.isArray(resolvedSchema.type) ? resolvedSchema.type : [resolvedSchema.type];
        schemaDict[fullFieldName] = types.join(' | ') || 'any';
      }
    }
    return schemaDict;
  }

  public getValue(fieldPath: string): any {
    const keys = fieldPath.split('.');
    let parentObj: any = this;
    for (let i = 0; i < keys.length; i++) {
      if (parentObj === undefined) {
        throw new Error(`Field '${fieldPath}' does not exist in the schema.`);
      }
      parentObj = parentObj[keys[i]];
    }
    return parentObj;
  }

  public setValue(fieldPath: string, value: any): void {
    const keys = fieldPath.split('.');
    let parentObj: any = this;
    for (let i = 0; i < keys.length - 1; i++) {
      parentObj = parentObj[keys[i]];
      if (parentObj === undefined) {
        throw new Error(`Field '${fieldPath}' does not exist in the schema.`);
      }
    }
    const fieldName = keys[keys.length - 1];
    if (parentObj.hasOwnProperty(fieldName)) {
      parentObj[fieldName] = value;
    } else {
      throw new Error(`Field '${fieldPath}' does not exist in the schema.`);
    }
  }

  public createObjectFromSchema(): any {
    return this._createObjectFromSchema(this._schema);
  }

  private _createObjectFromSchema(schema: JSONSchema): any {
    const result: any = {};
    const properties = schema.properties || {};

    for (const [key, propSchema] of Object.entries(properties)) {
      const resolvedSchema = this.processSchema(propSchema);

      if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
        result[key] = this._createObjectFromSchema(resolvedSchema);
      } else if (resolvedSchema.type === 'array') {
        const itemSchema = resolvedSchema.items
          ? this.processSchema(resolvedSchema.items)
          : {};
        result[key] = [this._createObjectFromSchema(itemSchema)];
      } else if (resolvedSchema.enum) {
        result[key] = resolvedSchema.default || resolvedSchema.enum[0];
      } else if (resolvedSchema.hasOwnProperty('default')) {
        result[key] = resolvedSchema.default;
      } else if (resolvedSchema.nullable) {
        result[key] = null;
      } else {
        result[key] = this.getDefaultValueForType(resolvedSchema.type);
      }
    }

    return result;
  }

  private getDefaultValueForType(type?: string | string[]): any {
    const actualType = Array.isArray(type) ? type[0] : type;
    switch (actualType) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }
}

export default JSPydanticModel;