/**
 * Auth API Endpoints
 * RTK Query endpoints for authentication
 */

import { baseApi } from './baseApi';
import type { User } from '../../types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (data) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Profile', 'Match', 'Conversation'],
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/api/auth/me',
      providesTags: ['User'],
    }),
    refreshToken: builder.mutation<{ token: string; refreshToken: string }, void>({
      query: () => ({
        url: '/api/auth/refresh-token',
        method: 'POST',
      }),
    }),
    verifyEmail: builder.mutation<{ success: boolean }, string>({
      query: (token) => ({
        url: `/api/auth/verify-email/${token}`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    requestPasswordReset: builder.mutation<{ success: boolean }, string>({
      query: (email) => ({
        url: '/api/auth/request-password-reset',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation<{ success: boolean }, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/api/auth/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useVerifyEmailMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
} = authApi;
