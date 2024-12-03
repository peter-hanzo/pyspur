import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import flowReducer from './flowSlice';
import nodeTypesReducer from './nodeTypesSlice';
import { PersistConfig } from 'redux-persist';

// Define the RootState type
export type RootState = ReturnType<typeof rootReducer>;

// Define the persist config type
const persistConfig: PersistConfig<RootState> = {
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
