import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import matchingReducer from './slices/matchingSlice';
import messagingReducer from './slices/messagingSlice';
import callReducer from './slices/callSlice';
import { baseApi } from './api/baseApi';
import { socketMiddleware } from './middleware/socketMiddleware';
import { listenerMiddleware } from './middleware/stateListeners';
import { migrate } from './migrations';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  matching: matchingReducer,
  messaging: messagingReducer,
  call: callReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

// Redux persist configuration
const persistConfig = {
  key: 'flamoral-web',
  version: 1,
  storage,
  whitelist: ['auth'], // Only persist auth state
  blacklist: ['call', 'messaging', 'matching', 'profile', baseApi.reducerPath], // Don't persist these
  migrate, // Add migration support
  debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ['payload.timestamp', 'meta.arg', 'meta.baseQueryMeta'],
        ignoredPaths: ['call.activeCall.startTime', 'call.activeCall.endTime', 'call.incomingCall.timestamp'],
      },
    })
    .concat(baseApi.middleware)
    .prepend(listenerMiddleware.middleware)
    .concat(socketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export selectors
export * from './selectors';

// Export actions from slices
export * from './slices/authSlice';
export * from './slices/profileSlice';
export * from './slices/matchingSlice';
export * from './slices/messagingSlice';
export * from './slices/callSlice';

// Export thunks
export * from './thunks';

// Export API hooks
export * from './api';
