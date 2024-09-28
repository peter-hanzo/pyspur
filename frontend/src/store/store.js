import { configureStore } from '@reduxjs/toolkit';
import flowReducer from './flowSlice'; // Import the flow slice reducer

// Create the Redux store with the flow reducer
const store = configureStore({
  reducer: {
    flow: flowReducer,
  },
});

export default store;