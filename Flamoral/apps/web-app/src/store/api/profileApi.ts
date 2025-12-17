/**
 * Profile API Endpoints
 * RTK Query endpoints for profile management
 */

import { baseApi } from './baseApi';
import type { Profile } from '../../types';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentProfile: builder.query<Profile, void>({
      query: () => '/api/profile/me',
      providesTags: ['Profile'],
    }),
    getProfileById: builder.query<Profile, string>({
      query: (id) => `/api/profile/${id}`,
      providesTags: (result, error, id) => [{ type: 'Profile', id }],
    }),
    updateProfile: builder.mutation<Profile, Partial<Profile>>({
      query: (updates) => ({
        url: '/api/profile/me',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['Profile'],
    }),
    uploadProfilePhoto: builder.mutation<{ photoUrl: string }, FormData>({
      query: (formData) => ({
        url: '/api/profile/photo',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Profile'],
    }),
    deleteProfilePhoto: builder.mutation<{ success: boolean }, string>({
      query: (photoId) => ({
        url: `/api/profile/photo/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    getDiscoveryProfiles: builder.query<Profile[], { filters?: any; limit?: number }>({
      query: ({ filters = {}, limit = 20 }) => ({
        url: '/api/discovery/profiles',
        method: 'POST',
        body: { filters, limit },
      }),
    }),
  }),
});

export const {
  useGetCurrentProfileQuery,
  useGetProfileByIdQuery,
  useUpdateProfileMutation,
  useUploadProfilePhotoMutation,
  useDeleteProfilePhotoMutation,
  useGetDiscoveryProfilesQuery,
} = profileApi;
