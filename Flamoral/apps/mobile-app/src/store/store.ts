import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

// Import reducers (we'll create these)
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import matchingReducer from './slices/matchingSlice';
import messagingReducer from './slices/messagingSlice';
import offlineReducer from './slices/offlineSlice';
import discoveryReducer from './slices/discoverySlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'offline', 'matching', 'messaging', 'discovery'], // Persist offline, matching, messaging, and discovery data
};

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  matching: matchingReducer,
  messaging: messagingReducer,
  offline: offlineReducer,
  discovery: discoveryReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
