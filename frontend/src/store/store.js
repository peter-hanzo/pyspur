import { configureStore } from '@reduxjs/toolkit';
import flowReducer from './flowSlice';

// Create the Redux store with the flow reducer
const store = configureStore({
  reducer: {
    flow: flowReducer,
  },
});

export default store;