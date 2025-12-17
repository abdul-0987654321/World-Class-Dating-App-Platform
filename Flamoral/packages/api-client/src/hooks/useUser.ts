/**
 * User Hooks
 * React Query hooks for user-related operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  birthday: string;
  age: number;
  gender: string;
  interestedIn: string[];
  bio: string;
  photos: Photo[];
  location: Location;
  interests: string[];
  prompts: Prompt[];
  relationshipGoal: string;
  lifestyle: Lifestyle;
  verification: Verification;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  position: number;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

export interface Prompt {
  id: string;
  promptId: string;
  question: string;
  answer: string;
}

export interface Lifestyle {
  smoking: string;
  drinking: string;
  exercise: string;
  diet: string;
  pets: string;
}

export interface Verification {
  emailVerified: boolean;
  phoneVerified: boolean;
  photoVerified: boolean;
  idVerified: boolean;
}

export interface UserPreferences {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  showMe: string[];
  globalMode: boolean;
  showVerifiedOnly: boolean;
  incognitoMode: boolean;
}

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  user: (id: string) => [...userKeys.all, id] as const,
  preferences: () => [...userKeys.all, 'preferences'] as const,
  blocked: () => [...userKeys.all, 'blocked'] as const,
};

// Hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => getApiClient().get<User>('/users/me'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.user(userId),
    queryFn: () => getApiClient().get<User>(`/users/${userId}`),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserPreferences() {
  return useQuery({
    queryKey: userKeys.preferences(),
    queryFn: () => getApiClient().get<UserPreferences>('/users/me/preferences'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) =>
      getApiClient().patch<User>('/users/me', data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.profile(), updatedUser);
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      getApiClient().patch<UserPreferences>('/users/me/preferences', data),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(userKeys.preferences(), updatedPreferences);
    },
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      position,
      onProgress,
    }: {
      file: File | Blob;
      position: number;
      onProgress?: (progress: number) => void;
    }) => {
      return getApiClient().upload<Photo>(
        `/users/me/photos?position=${position}`,
        file,
        onProgress
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) =>
      getApiClient().delete(`/users/me/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoIds: string[]) =>
      getApiClient().post('/users/me/photos/reorder', { photoIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      getApiClient().post(`/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.blocked() });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      getApiClient().delete(`/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.blocked() });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: ({
      userId,
      reason,
      description,
    }: {
      userId: string;
      reason: string;
      description?: string;
    }) =>
      getApiClient().post(`/users/${userId}/report`, { reason, description }),
  });
}
