import React, { useState } from 'react';
import { FaCrown, FaArrowUp, FaArrowDown, FaCheck, FaTimes, FaGem } from 'react-icons/fa';
import { useUpdateSubscription } from '../../hooks/useAdminUsers';
import type { AdminUser } from '../../services/admin-user.service';

interface SubscriptionManagementProps {
  user: AdminUser;
  onUpdate?: () => void;
}

const SUBSCRIPTION_TIERS = [
  {
    tier: 'FREE',
    name: 'Free',
    color: 'gray',
    gradient: 'from-gray-400 to-gray-500',
    icon: FaCrown,
    features: ['Basic matching', 'Limited swipes', 'See matches'],
  },
  {
    tier: 'GOLD',
    name: 'Gold',
    color: 'yellow',
    gradient: 'from-yellow-400 to-yellow-600',
    icon: FaCrown,
    features: ['Unlimited swipes', 'See who liked you', 'Monthly boost', 'No ads'],
  },
  {
    tier: 'PLATINUM',
    name: 'Platinum',
    color: 'blue',
    gradient: 'from-blue-400 to-blue-600',
    icon: FaGem,
    features: ['All Gold features', 'Priority likes', 'Message before matching', 'Incognito mode'],
  },
  {
    tier: 'DIAMOND',
    name: 'Diamond',
    color: 'purple',
    gradient: 'from-purple-400 to-purple-600',
    icon: FaGem,
    features: ['All Platinum features', 'VIP badge', 'Unlimited boosts', 'Priority support'],
  },
] as const;

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  user,
  onUpdate,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<(typeof SUBSCRIPTION_TIERS)[number] | null>(
    null
  );
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState('');

  const updateSubscriptionMutation = useUpdateSubscription();

  const currentTierIndex = SUBSCRIPTION_TIERS.findIndex((t) => t.tier === user.subscription);

  const handleTierClick = (tier: (typeof SUBSCRIPTION_TIERS)[number]) => {
    if (tier.tier === user.subscription) return;
    setSelectedTier(tier);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier || !reason.trim()) return;

    await updateSubscriptionMutation.mutateAsync({
      userId: user.id,
      data: {
        tier: selectedTier.tier as any,
        duration: selectedTier.tier === 'FREE' ? undefined : duration,
        reason: reason.trim(),
      },
    });

    setShowModal(false);
    setSelectedTier(null);
    setReason('');
    setDuration(1);
    onUpdate?.();
  };

  const getActionType = () => {
    if (!selectedTier) return null;
    const selectedIndex = SUBSCRIPTION_TIERS.findIndex((t) => t.tier === selectedTier.tier);
    if (selectedIndex > currentTierIndex) return 'upgrade';
    if (selectedIndex < currentTierIndex) return 'downgrade';
    return null;
  };

  const getTierBadgeClass = (tier: string) => {
    const tier_obj = SUBSCRIPTION_TIERS.find((t) => t.tier === tier);
    if (!tier_obj) return 'bg-gray-100 text-gray-700';
    return `bg-${tier_obj.color}-100 text-${tier_obj.color}-700`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Management</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeClass(user.subscription)}`}
          >
            {user.subscription}
          </span>
        </div>
      </div>

      {/* Current Subscription Details */}
      <div className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
        <div className="flex items-center gap-3 mb-3">
          {React.createElement(SUBSCRIPTION_TIERS[currentTierIndex].icon, {
            className: 'text-3xl text-yellow-500',
          })}
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              {SUBSCRIPTION_TIERS[currentTierIndex].name}
            </h4>
            <p className="text-sm text-gray-600">Active Subscription</p>
          </div>
        </div>
        {user.subscription !== 'FREE' && user.subscriptionEndDate && (
          <p className="text-sm text-gray-600">
            Expires: {new Date(user.subscriptionEndDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Available Tiers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Change Subscription Tier</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const isCurrent = tier.tier === user.subscription;
            const tierIndex = SUBSCRIPTION_TIERS.findIndex((t) => t.tier === tier.tier);
            const isUpgrade = tierIndex > currentTierIndex;
            const isDowngrade = tierIndex < currentTierIndex;

            return (
              <button
                key={tier.tier}
                onClick={() => handleTierClick(tier)}
                disabled={isCurrent}
                className={`relative p-4 rounded-xl border-2 transition text-left ${
                  isCurrent
                    ? 'border-pink-500 bg-pink-50 cursor-default'
                    : 'border-gray-200 hover:border-pink-300 hover:shadow-md cursor-pointer'
                }`}
              >
                {/* Badge */}
                <div className="absolute top-2 right-2">
                  {isCurrent && (
                    <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs font-semibold">
                      Current
                    </span>
                  )}
                  {isUpgrade && !isCurrent && (
                    <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold flex items-center gap-1">
                      <FaArrowUp />
                      Upgrade
                    </span>
                  )}
                  {isDowngrade && !isCurrent && (
                    <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-semibold flex items-center gap-1">
                      <FaArrowDown />
                      Downgrade
                    </span>
                  )}
                </div>

                {/* Tier Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-white`}
                  >
                    {React.createElement(tier.icon, { className: 'text-xl' })}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">{tier.name}</h5>
                    <p className="text-xs text-gray-500">{tier.tier}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <FaCheck className="text-green-500 text-xs flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* Change Modal */}
      {showModal && selectedTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {getActionType() === 'upgrade' ? 'Upgrade' : 'Downgrade'} Subscription
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
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

              {/* Change Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeClass(user.subscription)}`}
                    >
                      {user.subscription}
                    </span>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierBadgeClass(selectedTier.tier)}`}
                    >
                      {selectedTier.tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duration (for paid tiers only) */}
              {selectedTier.tier !== 'FREE' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (months)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="1">1 month</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    New expiration:{' '}
                    {new Date(
                      Date.now() + duration * 30 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a reason for this subscription change..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be logged for audit purposes.
                </p>
              </div>

              {/* Warning for downgrade */}
              {getActionType() === 'downgrade' && (
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Downgrading will immediately restrict the user's access
                    to premium features.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={updateSubscriptionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubscriptionMutation.isPending || !reason.trim()}
                  className={`flex-1 px-4 py-2 ${
                    getActionType() === 'upgrade' ? 'bg-green-500' : 'bg-orange-500'
                  } text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {updateSubscriptionMutation.isPending
                    ? 'Processing...'
                    : `${getActionType() === 'upgrade' ? 'Upgrade' : 'Downgrade'} User`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
