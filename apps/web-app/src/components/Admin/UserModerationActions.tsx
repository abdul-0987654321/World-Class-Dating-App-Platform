import React, { useState, useEffect } from 'react';
import {
  FaExclamationTriangle,
  FaUserSlash,
  FaBan,
  FaUndo,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { useModerationAction } from '../../hooks/useAdminUsers';
import { authService } from '../../services';
import type { AdminUser, ModerationAction } from '../../services/admin-user.service';

interface UserModerationActionsProps {
  user: AdminUser;
  onActionComplete?: () => void;
}

export const UserModerationActions: React.FC<UserModerationActionsProps> = ({
  user,
  onActionComplete,
}) => {
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);

  const [reason, setReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');

  const moderationMutation = useModerationAction();

  // Fetch current admin user ID from auth context
  useEffect(() => {
    const fetchAdminId = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setCurrentAdminId(currentUser.id);
      } catch (error) {
        console.error('Failed to get current admin user:', error);
      }
    };
    fetchAdminId();
  }, []);

  const handleAction = async (action: ModerationAction) => {
    await moderationMutation.mutateAsync({
      userId: user.id,
      action,
    });

    // Reset form
    setReason('');
    setSuspensionDays(7);

    // Close modals
    setShowWarnModal(false);
    setShowSuspendModal(false);
    setShowBanModal(false);
    setShowUnbanModal(false);
    setShowUnsuspendModal(false);

    onActionComplete?.();
  };

  const ActionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    actionType: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
    actionLabel: string;
    actionColor: string;
    warningMessage?: string;
    showDurationField?: boolean;
  }> = ({
    isOpen,
    onClose,
    title,
    description,
    actionType,
    actionLabel,
    actionColor,
    warningMessage,
    showDurationField,
  }) => {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!reason.trim()) {
        return;
      }

      const action: ModerationAction = {
        type: actionType,
        reason: reason.trim(),
        adminId: currentAdminId,
        ...(showDurationField && { duration: suspensionDays }),
      };

      handleAction(action);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* User Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{description}</p>

            {warningMessage && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-800">{warningMessage}</p>
                </div>
              </div>
            )}

            {showDurationField && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suspension Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={suspensionDays}
                  onChange={(e) => setSuspensionDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  User will be suspended until{' '}
                  {new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a detailed reason for this action..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be logged and may be shown to the user.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={moderationMutation.isPending || !reason.trim()}
                className={`flex-1 px-4 py-2 ${actionColor} text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {moderationMutation.isPending ? 'Processing...' : actionLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Moderation Actions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Warn User */}
        {!user.isBanned && !user.isSuspended && (
          <button
            onClick={() => setShowWarnModal(true)}
            className="flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition group"
          >
            <FaExclamationTriangle className="text-yellow-600 text-xl" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-yellow-700">Warn User</p>
              <p className="text-xs text-gray-600">Issue a warning without restrictions</p>
            </div>
          </button>
        )}

        {/* Suspend User */}
        {!user.isBanned && !user.isSuspended && (
          <button
            onClick={() => setShowSuspendModal(true)}
            className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition group"
          >
            <FaUserSlash className="text-orange-600 text-xl" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-orange-700">Suspend User</p>
              <p className="text-xs text-gray-600">Temporarily restrict account access</p>
            </div>
          </button>
        )}

        {/* Unsuspend User */}
        {user.isSuspended && !user.isBanned && (
          <button
            onClick={() => setShowUnsuspendModal(true)}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition group"
          >
            <FaCheck className="text-green-600 text-xl" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-green-700">Unsuspend User</p>
              <p className="text-xs text-gray-600">Lift temporary suspension</p>
            </div>
          </button>
        )}

        {/* Ban User */}
        {!user.isBanned && (
          <button
            onClick={() => setShowBanModal(true)}
            className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition group"
          >
            <FaBan className="text-red-600 text-xl" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-red-700">Ban User</p>
              <p className="text-xs text-gray-600">Permanently ban from platform</p>
            </div>
          </button>
        )}

        {/* Unban User */}
        {user.isBanned && (
          <button
            onClick={() => setShowUnbanModal(true)}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition group"
          >
            <FaUndo className="text-green-600 text-xl" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-green-700">Unban User</p>
              <p className="text-xs text-gray-600">Lift permanent ban</p>
            </div>
          </button>
        )}
      </div>

      {/* Modals */}
      <ActionModal
        isOpen={showWarnModal}
        onClose={() => setShowWarnModal(false)}
        title="Warn User"
        description="Issue a formal warning to this user. This will be recorded in their violation history."
        actionType="warn"
        actionLabel="Issue Warning"
        actionColor="bg-yellow-500"
      />

      <ActionModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend User"
        description="Temporarily suspend this user's account. They will not be able to access the platform during the suspension period."
        actionType="suspend"
        actionLabel="Suspend User"
        actionColor="bg-orange-500"
        showDurationField
      />

      <ActionModal
        isOpen={showUnsuspendModal}
        onClose={() => setShowUnsuspendModal(false)}
        title="Unsuspend User"
        description="Lift the temporary suspension on this user's account. They will regain full access to the platform."
        actionType="unsuspend"
        actionLabel="Unsuspend User"
        actionColor="bg-green-500"
      />

      <ActionModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Ban User"
        description="Permanently ban this user from the platform. This action should only be taken for severe violations."
        actionType="ban"
        actionLabel="Ban User Permanently"
        actionColor="bg-red-500"
        warningMessage="Warning: This is a permanent action. The user will lose all access to the platform and their data may be subject to deletion according to our data retention policy."
      />

      <ActionModal
        isOpen={showUnbanModal}
        onClose={() => setShowUnbanModal(false)}
        title="Unban User"
        description="Lift the permanent ban on this user's account. They will be able to access the platform again."
        actionType="unban"
        actionLabel="Unban User"
        actionColor="bg-green-500"
      />
    </div>
  );
};

export default UserModerationActions;
