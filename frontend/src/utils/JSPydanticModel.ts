import Ajv, { ValidateFunction, Schema as AjvSchema } from 'ajv';
import addFormats from 'ajv-formats';

// Define types for the schema and metadata
interface NodeSchema {
  input?: Record<string, any>;
  output?: Record<string, any>;
  config?: Record<string, any>;
  name?: string;
  visual_tag?: string;
  [key: string]: any;
}

interface Schema {
  primitives?: NodeSchema[];
  json?: NodeSchema[];
  llm?: NodeSchema[];
  python?: NodeSchema[];
  subworkflow?: NodeSchema[];
  [key: string]: any;
}

interface Metadata {
  primitives: Array<Record<string, any>>;
  json: Array<Record<string, any>>;
  llm: Array<Record<string, any>>;
  python: Array<Record<string, any>>;
  subworkflow: Array<Record<string, any>>;
  [key: string]: any;
}

interface Constraints {
  [propertyPath: string]: {
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
    type?: string;
    enum?: any[];
    required?: boolean;
  };
}

class JSPydanticModel {
  private _schema: Schema;
  private ajv: Ajv;
  private _metadata?: Metadata;
  private _constraints?: Constraints;

  constructor(schema: Schema) {
    this._schema = schema;
    this.ajv = new Ajv({
      useDefaults: true,
      coerceTypes: true,
      removeAdditional: true,
      allErrors: true,
    });
    addFormats(this.ajv);
  }

  createObjectFromSchema(): Record<string, any> | null {
    if (
      this._schema.primitives ||
      this._schema.json ||
      this._schema.llm ||
      this._schema.python ||
      this._schema.subworkflow
    ) {
      return this.processNodeTypesSchema(this._schema);
    }

    try {
      const validate: ValidateFunction = this.ajv.compile(this._schema as AjvSchema);
      const obj: Record<string, any> = {};
      validate(obj);
      return this.excludeSchemaKeywords(obj);
    } catch (error) {
      console.error('Error compiling schema:', error);
      return null;
    }
  }

  private excludeSchemaKeywords(obj: any): any {
    const schemaKeywords = ['$defs', 'properties', 'anyOf', 'oneOf', 'allOf', 'items', 'additionalProperties', '$ref'];
    if (Array.isArray(obj)) {
      return obj.map(item => this.excludeSchemaKeywords(item));
    } else if (obj && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        if (!schemaKeywords.includes(key)) {
          acc[key] = this.excludeSchemaKeywords(obj[key]);
        }
        return acc;
      }, {} as Record<string, any>);
    } else {
      return obj;
    }
  }

  private processNodeTypesSchema(schema: Schema): Record<string, any> {
    const result: Record<string, any> = {};

    ['primitives', 'json', 'llm', 'python', 'subworkflow'].forEach(category => {
      if (schema[category]) {
        result[category] = schema[category]!.map(node => {
          const processedNode: NodeSchema = { ...node };

          ['input', 'output', 'config'].forEach(key => {
            if (node[key]) {
              try {
                const validator = this.ajv.compile(node[key] as AjvSchema);
                const obj: Record<string, any> = {};
                validator(obj);
                processedNode[key] = {
                  ...node[key],
                  ...obj,
                };
                processedNode[key] = this.excludeSchemaKeywords(processedNode[key]);
              } catch (error) {
                console.error(`Error processing ${key} schema for node:`, error);
                processedNode[key] = node[key] || {};
              }
            }
          });

          return processedNode;
        });
      }
    });

    return result;
  }

  private extractMetadata(): void {
    this._metadata = {
      primitives: [],
      json: [],
      llm: [],
      python: [],
      subworkflow: [],
    };
    this._extractMetadata(this._schema);
  }

  private _extractMetadata(schema: any, path: (string | number)[] = []): void {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    if (schema.anyOf || schema.oneOf) {
      const variants = schema.anyOf || schema.oneOf;
      const nonNullVariant = variants.find((v: any) => v.type !== 'null');
      if (nonNullVariant) {
        const mergedSchema = {
          ...schema,
          ...nonNullVariant,
        };
        delete mergedSchema.anyOf;
        delete mergedSchema.oneOf;
        this._extractMetadata(mergedSchema, path);
        return;
      }
    }

    const metadataKeys = [
      'type', 'title', 'description', 'default',
      'minimum', 'maximum', 'minItems', 'maxItems',
      'minLength', 'maxLength', 'pattern', 'enum',
      'required', 'additionalProperties', 'name', 'description',
      'visual_tag',
    ];

    const metadata = metadataKeys.reduce((acc, key) => {
      if (schema[key] !== undefined) {
        acc[key] = schema[key];
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(metadata).length > 0) {
      this.setNestedMetadata(path, metadata);
    }

    ['primitives', 'json', 'llm', 'python', 'subworkflow'].forEach(category => {
      if (Array.isArray(schema[category])) {
        if (!this._metadata![category]) {
          this._metadata![category] = [];
        }

        schema[category].forEach((node: any, index: number) => {
          if (!this._metadata![category][index]) {
            this._metadata![category][index] = {
              name: node.name,
              visual_tag: node.visual_tag,
              input: {},
              output: {},
              config: {},
            };
          } else {
            this._metadata![category][index].name = node.name;
            this._metadata![category][index].visual_tag = node.visual_tag;
          }

          ['input', 'output', 'config'].forEach(schemaType => {
            if (node[schemaType]) {
              const newPath = [category, index, schemaType];
              this._extractMetadata(node[schemaType], newPath);

              if (schemaType === 'config' && node[schemaType].$defs) {
                Object.entries(node[schemaType].$defs).forEach(([key, value]) => {
                  this._extractMetadata(value, [...newPath, key]);
                });
              }

              if (node[schemaType].properties) {
                Object.entries(node[schemaType].properties).forEach(([key, value]) => {
                  this._extractMetadata(value, [...newPath, key]);
                });
              }
            }
          });
        });
      }
    });

    if (schema.$ref) {
      const refPath = schema.$ref.replace(/^#\//, '').split('/');
      let refSchema: any = this._schema;

      if (refPath[0] === '$defs') {
        const currentContext = this.findContextWithDefs(schema);
        if (currentContext && currentContext.$defs) {
          refSchema = currentContext.$defs[refPath[1]];
          if (refSchema) {
            this._extractMetadata(refSchema, path);
          }
        }
      } else {
        for (const part of refPath) {
          if (refSchema && typeof refSchema === 'object') {
            refSchema = refSchema[part];
          }
        }
        if (refSchema) {
          this._extractMetadata(refSchema, path);
        }
      }
      return;
    }

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        this._extractMetadata(value, [...path, key]);
      });
    }

    if (schema.items) {
      this._extractMetadata(schema.items, [...path, 'items']);
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      this._extractMetadata(schema.additionalProperties, [...path, 'additionalProperties']);
    }
  }

  private setNestedMetadata(path: (string | number)[], metadata: Record<string, any>): void {
    if (path.length === 0) return;

    let current: any = this._metadata;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (Array.isArray(current)) {
        if (!current[key]) {
          current[key] = {};
        }
      } else {
        if (!current[key]) {
          current[key] = isNaN(Number(path[i + 1])) ? {} : [];
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

  getPropertyMetadata(propertyPath: string): Record<string, any> | null {
    if (!this._metadata) {
      this.extractMetadata();
    }
    if (!propertyPath) return null;
    const parts = propertyPath.split('.');
    let current: any = this._metadata;

    for (const part of parts) {
      if (!current || !current[part]) return null;
      current = current[part];
    }

    return current;
  }

  getAllMetadata(): Metadata {
    if (!this._metadata) {
      this.extractMetadata();
    }
    return this._metadata!;
  }

  getPropertyDefault(propertyPath: string): any {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.default;
  }

  getPropertyType(propertyPath: string): string | undefined {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.type;
  }

  getPropertyConstraints(propertyPath: string): Record<string, any> {
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

  isPropertyRequired(propertyPath: string): boolean {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.required || false;
  }

  getPropertyEnum(propertyPath: string): any[] | undefined {
    const metadata = this.getPropertyMetadata(propertyPath);
    return metadata?.enum;
  }

  private findContextWithDefs(schema: any): any {
    let context: any = schema;

    while (context && !context.$defs) {
      if (context === this._schema) {
        break;
      }
      context = this.findParentContext(schema);
    }

    return context || this._schema;
  }

  private findParentContext(schema: any, currentContext: any = this._schema): any {
    if (!currentContext || typeof currentContext !== 'object') {
      return null;
    }

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

  private extractConstraints(): void {
    this._constraints = {};
    this._extractConstraints(this._schema);
  }

  private _extractConstraints(schema: any, path: (string | number)[] = []): void {
    const constraintKeys = [
      'minimum', 'maximum', 'minItems', 'maxItems',
      'minLength', 'maxLength', 'pattern',
      'exclusiveMinimum', 'exclusiveMaximum',
      'minProperties', 'maxProperties',
      'type', 'enum',
    ];

    const constraints = constraintKeys.reduce((acc, key) => {
      if (schema[key] !== undefined) {
        acc[key] = schema[key];
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(constraints).length > 0) {
      const propertyName = path.join('.');
      if (propertyName) {
        this._constraints![propertyName] = constraints;
      }
    }

    if (schema.$ref) {
      const refPath = schema.$ref.replace(/^#\//, '').split('/');
      let refSchema: any = this._schema;

      if (refPath[0] === '$defs') {
        const currentContext = this.findContextWithDefs(schema);
        if (currentContext && currentContext.$defs) {
          refSchema = currentContext.$defs[refPath[1]];
        }
      } else {
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
        this._extractConstraints(refSchema, path);
      }
      return;
    }

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        this._extractConstraints(value, [...path, key]);
      });
    } else if (schema.anyOf || schema.oneOf || schema.allOf) {
      const schemas = schema.anyOf || schema.oneOf || schema.allOf;
      schemas.forEach(subSchema => {
        this._extractConstraints(subSchema, path);
      });
    }

    if (schema.items) {
      this._extractConstraints(schema.items, [...path, 'items']);
    }
  }

  getConstraints(): Constraints {
    if (!this._constraints) {
      this.extractConstraints();
    }
    return this._constraints!;
  }
}

export default JSPydanticModel;