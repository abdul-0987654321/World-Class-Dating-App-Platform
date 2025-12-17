/**
 * Notification Redux Slice
 * Manages notification state and preferences
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
  id: string;
  type: 'new_match' | 'new_message' | 'super_like' | 'profile_view' | 'video_call' | 'other';
  title: string;
  body: string;
  imageUrl?: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  matches: boolean;
  messages: boolean;
  likes: boolean;
  superLikes: boolean;
  profileViews: boolean;
  videoCalls: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

interface NotificationState {
  fcmToken: string | null;
  apnsToken: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  preferences: NotificationPreferences;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  fcmToken: null,
  apnsToken: null,
  notifications: [],
  unreadCount: 0,
  preferences: {
    pushEnabled: true,
    emailEnabled: true,
    matches: true,
    messages: true,
    likes: true,
    superLikes: true,
    profileViews: true,
    videoCalls: true,
    marketing: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  },
  permissionGranted: false,
  loading: false,
  error: null,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const response = await axios.get(`${process.env.API_URL}/api/notifications`, {
      params: { page, limit },
    });
    return response.data;
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const response = await axios.get(`${process.env.API_URL}/api/notifications/unread-count`);
    return response.data.count;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string) => {
    await axios.put(`${process.env.API_URL}/api/notifications/${notificationId}/read`);
    return notificationId;
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await axios.put(`${process.env.API_URL}/api/notifications/mark-all-read`);
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId: string) => {
    await axios.delete(`${process.env.API_URL}/api/notifications/${notificationId}`);
    return notificationId;
  }
);

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences: Partial<NotificationPreferences>) => {
    const response = await axios.put(
      `${process.env.API_URL}/api/notifications/preferences`,
      preferences
    );
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(response.data));
    return response.data;
  }
);

export const registerDeviceToken = createAsyncThunk(
  'notifications/registerToken',
  async ({ token, platform }: { token: string; platform: 'ios' | 'android' }) => {
    const response = await axios.post(`${process.env.API_URL}/api/notifications/register`, {
      token,
      platform,
    });
    await AsyncStorage.setItem('deviceToken', token);
    return { token, platform };
  }
);

export const loadPreferences = createAsyncThunk(
  'notifications/loadPreferences',
  async () => {
    try {
      const stored = await AsyncStorage.getItem('notificationPreferences');
      if (stored) {
        return JSON.parse(stored);
      }

      // Fetch from server if not cached
      const response = await axios.get(`${process.env.API_URL}/api/notifications/preferences`);
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      return null;
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount++;
      }
    },
    setFcmToken: (state, action: PayloadAction<string>) => {
      state.fcmToken = action.payload;
    },
    setApnsToken: (state, action: PayloadAction<string>) => {
      state.apnsToken = action.payload;
    },
    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      })

      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })

      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload);
        if (index !== -1) {
          const wasUnread = !state.notifications[index].read;
          state.notifications.splice(index, 1);
          if (wasUnread) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })

      // Update preferences
      .addCase(updatePreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update preferences';
      })

      // Register device token
      .addCase(registerDeviceToken.fulfilled, (state, action) => {
        if (action.payload.platform === 'ios') {
          state.apnsToken = action.payload.token;
        } else {
          state.fcmToken = action.payload.token;
        }
      })

      // Load preferences
      .addCase(loadPreferences.fulfilled, (state, action) => {
        if (action.payload) {
          state.preferences = action.payload;
        }
      });
  },
});

export const {
  addNotification,
  setFcmToken,
  setApnsToken,
  setPermissionGranted,
  clearNotifications,
  clearError,
} = notificationSlice.actions;

export default notificationSlice.reducer;
