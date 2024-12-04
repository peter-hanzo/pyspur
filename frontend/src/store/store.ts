import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import flowReducer from './flowSlice';
import nodeTypesReducer from './nodeTypesSlice';
import type { Node, Edge } from '@xyflow/react';

// Define the RootState type
export interface RootState {
  flow: {
    nodes: Node[];
    edges: Edge[];
    workflowID: string | null;
    workflowInputVariables: Record<string, any>;
    projectName: string;
    testInputs: Record<string, any>;
    selectedNode: string | null;
    nodeTypes: string[];
    sidebarWidth: number;
  };
  nodeTypes: {
    data: Record<string, any>;
  };
}

// Define the persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['nodes', 'edges', 'nodeTypes'],
};

const rootReducer = combineReducers({
  flow: flowReducer,
  nodeTypes: nodeTypesReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Define store types
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export const persistor = persistStore(store);
export default store;
