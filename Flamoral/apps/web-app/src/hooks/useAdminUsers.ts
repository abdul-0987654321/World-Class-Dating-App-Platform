/**
 * React Query hooks for Admin User Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  adminUserService,
  type AdminUser,
  type AdminUserActivity,
  type UserMatch,
  type UserConversation,
  type UserReport,
  type ModerationAction,
  type UpdateUserRequest,
  type SubscriptionUpdateRequest,
  type UsersListParams,
} from '../services/admin-user.service';

// Query Keys
export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (params: UsersListParams) => [...adminUserKeys.lists(), params] as const,
  details: () => [...adminUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
  activity: (id: string) => [...adminUserKeys.detail(id), 'activity'] as const,
  matches: (id: string) => [...adminUserKeys.detail(id), 'matches'] as const,
  conversations: (id: string) => [...adminUserKeys.detail(id), 'conversations'] as const,
  reports: (id: string) => [...adminUserKeys.detail(id), 'reports'] as const,
};

// Hook: Get users list with filters
export function useAdminUsers(params: UsersListParams = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUserService.getUsers(params),
    staleTime: 30000, // 30 seconds
  });
}

// Hook: Get single user details
export function useAdminUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: adminUserKeys.detail(userId),
    queryFn: () => adminUserService.getUserById(userId),
    enabled: !!userId && enabled,
    staleTime: 60000, // 1 minute
  });
}

// Hook: Get user activity
export function useUserActivity(userId: string, enabled = true) {
  return useQuery({
    queryKey: adminUserKeys.activity(userId),
    queryFn: () => adminUserService.getUserActivity(userId),
    enabled: !!userId && enabled,
    staleTime: 30000,
  });
}

// Hook: Get user matches
export function useUserMatches(userId: string, enabled = true) {
  return useQuery({
    queryKey: adminUserKeys.matches(userId),
    queryFn: () => adminUserService.getUserMatches(userId),
    enabled: !!userId && enabled,
    staleTime: 60000,
  });
}

// Hook: Get user conversations
export function useUserConversations(userId: string, enabled = true) {
  return useQuery({
    queryKey: adminUserKeys.conversations(userId),
    queryFn: () => adminUserService.getUserConversations(userId),
    enabled: !!userId && enabled,
    staleTime: 60000,
  });
}

// Hook: Get user reports
export function useUserReports(userId: string, enabled = true) {
  return useQuery({
    queryKey: adminUserKeys.reports(userId),
    queryFn: () => adminUserService.getUserReports(userId),
    enabled: !!userId && enabled,
    staleTime: 30000,
  });
}

// Mutation: Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserRequest }) =>
      adminUserService.updateUser(userId, data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(user.id) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

// Mutation: Perform moderation action
export function useModerationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: ModerationAction }) =>
      adminUserService.performModerationAction(userId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });

      const actionMessages: Record<string, string> = {
        warn: 'User has been warned',
        suspend: 'User has been suspended',
        ban: 'User has been banned',
        unban: 'User has been unbanned',
        unsuspend: 'User suspension has been lifted',
      };

      toast.success(actionMessages[variables.action.type] || 'Moderation action completed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to perform moderation action');
    },
  });
}

// Mutation: Update subscription
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SubscriptionUpdateRequest }) =>
      adminUserService.updateSubscription(userId, data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(user.id) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      toast.success('Subscription updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });
}

// Mutation: Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

// Mutation: Verify user
export function useVerifyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.verifyUser(userId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(user.id) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      toast.success('User verified successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to verify user');
    },
  });
}

// Mutation: Reset password
export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => adminUserService.resetPassword(userId),
    onSuccess: () => {
      toast.success('Password reset email sent to user');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });
}
