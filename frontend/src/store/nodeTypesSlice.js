import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNodeTypes } from '../utils/api';

// Async thunk to fetch node types
export const fetchNodeTypes = createAsyncThunk('nodeTypes/fetchNodeTypes', async () => {
  const response = await getNodeTypes();
  return response;
});

const nodeTypesSlice = createSlice({
  name: 'nodeTypes',
  initialState: {
    types: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNodeTypes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNodeTypes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.types = action.payload;
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default nodeTypesSlice.reducer;