/**
 * Authentication Async Thunks
 * Handle async operations for authentication
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services';
import { loginStart, loginSuccess, loginFailure, logout } from '../slices/authSlice';
import type { User } from '../../types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * Login thunk
 */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginCredentials,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      dispatch(loginStart());
      const response = await authService.login(credentials.email, credentials.password);

      if (!response || !response.user || !response.token) {
        return rejectWithValue('Invalid response from server');
      }

      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken || '',
      }));

      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      dispatch(loginFailure(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Register thunk
 */
export const registerUser = createAsyncThunk<
  LoginResponse,
  RegisterData,
  { rejectValue: string }
>(
  'auth/register',
  async (data, { rejectWithValue, dispatch }) => {
    try {
      dispatch(loginStart());
      const response = await authService.register(data);

      if (!response || !response.user || !response.token) {
        return rejectWithValue('Invalid response from server');
      }

      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken || '',
      }));

      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Registration failed';
      dispatch(loginFailure(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Logout thunk
 */
export const logoutUser = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await authService.logout();
      dispatch(logout());
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Logout failed';
      return rejectWithValue(message);
    }
  }
);

/**
 * Refresh token thunk
 */
export const refreshToken = createAsyncThunk<
  { token: string; refreshToken: string },
  void,
  { rejectValue: string }
>(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken();
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Token refresh failed';
      return rejectWithValue(message);
    }
  }
);

/**
 * Verify email thunk
 */
export const verifyEmail = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(token);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Email verification failed';
      return rejectWithValue(message);
    }
  }
);

/**
 * Request password reset thunk
 */
export const requestPasswordReset = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authService.requestPasswordReset(email);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Password reset request failed';
      return rejectWithValue(message);
    }
  }
);

/**
 * Reset password thunk
 */
export const resetPassword = createAsyncThunk<
  { success: boolean },
  { token: string; password: string },
  { rejectValue: string }
>(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(token, password);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Password reset failed';
      return rejectWithValue(message);
    }
  }
);
