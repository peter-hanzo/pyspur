import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import flowReducer from './flowSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['nodes', 'edges', 'projectName'],
};

const persistedReducer = persistReducer(persistConfig, flowReducer);

const store = configureStore({
  reducer: {
    flow: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
export default store;