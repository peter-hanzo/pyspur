// DynamicModel.ts
import { store } from './store';
import { Dispatch } from 'redux';

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

class DynamicModel {
  [key: string]: any; // Allow dynamic properties

  private schema: JSONSchema;
  private dispatch: Dispatch;
  private modelName: string;

  constructor(schema: JSONSchema) {
    this.schema = schema;
    this.dispatch = store.dispatch;
    this.modelName = this.schema.title || 'DynamicModel';
    // Initialize state in Redux
    this.initializeState();
    // Define getters and setters for properties
    this.defineProperties();
  }

  private initializeState() {
    const initialState = this.processProperties(this.schema.properties);
    // Dispatch an action to set the initial state in Redux
    this.dispatch({
      type: 'INITIALIZE_STATE',
      payload: {
        modelName: this.modelName,
        data: initialState,
      },
    });
  }

  private processProperties(properties: { [key: string]: SchemaProperty }): any {
    const state: { [key: string]: any } = {};
    for (const key in properties) {
      const property = properties[key];
      if (property.type === 'object' && property.properties) {
        // Recursively process nested properties
        state[key] = this.processProperties(property.properties);
      } else {
        // Set default value or null if not provided
        state[key] = property.default !== undefined ? property.default : null;
      }
    }
    return state;
  }

  private defineProperties() {
    const properties = this.schema.properties;

    for (const key in properties) {
      Object.defineProperty(this, key, {
        get: () => {
          return this.get(key);
        },
        set: (value: any) => {
          this.set(key, value);
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  private get(field: string): any {
    const state = store.getState();
    const modelState = state.dynamicModels[this.modelName];
    return modelState ? modelState[field] : undefined;
  }

  private set(field: string, value: any) {
    const fieldType = this.schema.properties[field].type;
    if (!this.validateType(value, fieldType)) {
      throw new Error(`Invalid type for field ${field}: expected ${fieldType}, got ${typeof value}`);
    }
    // Update the Redux store
    this.dispatch({
      type: 'UPDATE_FIELD',
      payload: {
        modelName: this.modelName,
        field,
        value,
      },
    });
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

export default DynamicModel;
