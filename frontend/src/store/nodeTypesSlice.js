import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNodeTypes } from '../utils/api';

const initialState = {
  data: null,      // This will store the schema object
  metadata: null,  // This will store the metadata
  status: 'idle',
  error: null,
};

export const fetchNodeTypes = createAsyncThunk(
  'nodeTypes/fetchNodeTypes',
  async () => {
    const response = await getNodeTypes();
    return response;  // Now returns { schema, metadata }
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
      .addCase(fetchNodeTypes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload.schema;
        state.metadata = action.payload.metadata;
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

// Add selector to easily get metadata for a specific property
export const selectPropertyMetadata = (state, propertyPath) => {
  return state.nodeTypes.metadata?.[propertyPath] || null;
};

export default nodeTypesSlice.reducer;
