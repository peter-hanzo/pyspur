import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getNodeTypes } from '../utils/api';
import { RootState } from './store';

// Define interfaces for the metadata structure
interface NodeMetadata {
  name: string;
  [key: string]: any;  // Allow for additional dynamic properties
}

interface MetadataCategories {
  primitives: NodeMetadata[];
  json: NodeMetadata[];
  llm: NodeMetadata[];
  python: NodeMetadata[];
  subworkflow: NodeMetadata[];
  [key: string]: NodeMetadata[];  // Allow for additional categories
}

interface NodeTypesState {
  data: any | null;  // Schema type could be more specific based on your needs
  metadata: MetadataCategories | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

interface NodeTypesResponse {
  schema: any;  // Schema type could be more specific based on your needs
  metadata: MetadataCategories;
}

export interface NodeType {
  name: string;
  // add other properties that NodeType should have
}

const initialState: NodeTypesState = {
  data: null,
  metadata: null,
  status: 'idle',
  error: null,
};

export const fetchNodeTypes = createAsyncThunk<NodeTypesResponse>(
  'nodeTypes/fetchNodeTypes',
  async () => {
    const response = await getNodeTypes();
    return response;
  }
);

const nodeTypesSlice = createSlice({
  name: 'nodeTypes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNodeTypes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNodeTypes.fulfilled, (state, action: PayloadAction<NodeTypesResponse>) => {
        state.status = 'succeeded';
        state.data = action.payload.schema;
        state.metadata = action.payload.metadata;
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'An error occurred';
      });
  },
});

// Helper function to find metadata in the nested structure
const findMetadataInCategory = (
  metadata: MetadataCategories | null,
  nodeType: string,
  path: string
): any | null => {
  if (!metadata) return null;

  // Find which category the node belongs to
  const categories: (keyof MetadataCategories)[] = ['primitives', 'json', 'llm', 'python'];
  for (const category of categories) {
    const nodes = metadata[category];
    if (!nodes) continue;

    // Find the node in the category
    const node = nodes.find((node: NodeMetadata) => node.name === nodeType);
    if (!node) continue;

    // Navigate the remaining path
    const remainingPath = path.split('.');
    let current: any = node;

    for (const part of remainingPath) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;  // Path not found
      }
    }

    return current;  // Return the found metadata
  }

  return null;  // Node type not found in any category
};

export const selectPropertyMetadata = (state: RootState, propertyPath: string): any | null => {
  if (!propertyPath) return null;

  // Split path into nodeType and remaining path
  const [nodeType, ...pathParts] = propertyPath.split('.');
  const remainingPath = pathParts.join('.');
  return findMetadataInCategory(state.nodeTypes.metadata, nodeType, remainingPath);
};

export default nodeTypesSlice.reducer;