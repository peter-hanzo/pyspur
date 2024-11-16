import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNodeTypes } from '../utils/api';

const initialState = {
  data: null,  // This will store the schema object
  constraints: null,  // This will store the constraints
  status: 'idle',
  error: null,
};

export const fetchNodeTypes = createAsyncThunk(
  'nodeTypes/fetchNodeTypes',
  async () => {
    const response = await getNodeTypes();
    return response;  // Now returns { schemaObject, constraints }
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
        state.data = action.payload.schemaObject;  // Store schema object in data
        state.constraints = action.payload.constraints;  // Store constraints
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default nodeTypesSlice.reducer;

// Add a selector to get constraints
export const selectNodeTypeConstraints = (state) => state.nodeTypes.constraints;