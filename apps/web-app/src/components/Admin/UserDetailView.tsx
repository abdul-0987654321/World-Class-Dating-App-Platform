import React, { useState } from 'react';
import {
  FaUser,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaCrown,
  FaShieldAlt,
  FaCalendar,
  FaClock,
  FaChartLine,
  FaHeart,
  FaComments,
  FaImages,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useAdminUser, useUserActivity } from '../../hooks/useAdminUsers';
import type { AdminUser } from '../../services/admin-user.service';

interface UserDetailViewProps {
  userId: string;
  onClose?: () => void;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({ userId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'subscription'>('overview');

  const { data: user, isLoading: userLoading } = useAdminUser(userId);
  const { data: activity, isLoading: activityLoading } = useUserActivity(
    userId,
    activeTab === 'activity'
  );

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">User not found</p>
      </div>
    );
  }

  const getStatusColor = (user: AdminUser) => {
    if (user.isBanned) return 'text-red-600 bg-red-100';
    if (user.isSuspended) return 'text-orange-600 bg-orange-100';
    if (user.isActive) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getSubscriptionColor = (tier: string) => {
    const colors: Record<string, string> = {
      FREE: 'text-gray-700 bg-gray-100',
      GOLD: 'text-yellow-700 bg-yellow-100',
      PLATINUM: 'text-blue-700 bg-blue-100',
      DIAMOND: 'text-purple-700 bg-purple-100',
    };
    return colors[tier] || colors.FREE;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with User Info */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-20 h-20 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center text-2xl font-bold">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h2>
                {user.isVerified && <FaShieldAlt className="text-blue-300" title="Verified User" />}
              </div>
              <p className="text-white/90 mb-1">{user.email}</p>
              <p className="text-white/70 text-sm">User ID: {user.id}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user)}`}
                >
                  {user.isBanned
                    ? 'Banned'
                    : user.isSuspended
                      ? 'Suspended'
                      : user.isActive
                        ? 'Active'
                        : 'Inactive'}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getSubscriptionColor(user.subscription)}`}
                >
                  {user.subscription}
                </span>
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: FaUser },
            { id: 'activity', label: 'Activity', icon: FaChartLine },
            { id: 'subscription', label: 'Subscription', icon: FaCrown },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Profile Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaBirthdayCake className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Age</p>
                    <p className="font-medium">{user.age || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaVenusMars className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-medium capitalize">{user.gender || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaMapMarkerAlt className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{user.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaImages className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Photos</p>
                    <p className="font-medium">{user.photosCount || 0} photos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bio</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{user.bio}</p>
              </div>
            )}

            {/* Account Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaEnvelope className={user.emailVerified ? 'text-green-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs text-gray-500">Email Verification</p>
                    <p className="font-medium">
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaShieldAlt className={user.isVerified ? 'text-blue-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs text-gray-500">Profile Verification</p>
                    <p className="font-medium">{user.isVerified ? 'Verified' : 'Not Verified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaCalendar className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaClock className="text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="font-medium">{new Date(user.lastActive).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg">
                  <FaHeart className="text-pink-500 text-2xl mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{user.totalMatches}</p>
                  <p className="text-xs text-gray-600">Matches</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <FaComments className="text-purple-500 text-2xl mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{user.totalMessages}</p>
                  <p className="text-xs text-gray-600">Messages</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <FaImages className="text-blue-500 text-2xl mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{user.photosCount || 0}</p>
                  <p className="text-xs text-gray-600">Photos</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                  <FaExclamationTriangle className="text-red-500 text-2xl mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{user.reportCount}</p>
                  <p className="text-xs text-gray-600">Reports</p>
                </div>
              </div>
            </div>

            {/* Warnings/Alerts */}
            {(user.isSuspended || user.isBanned) && (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  user.isBanned ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle
                    className={user.isBanned ? 'text-red-500' : 'text-orange-500'}
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {user.isBanned ? 'Account Banned' : 'Account Suspended'}
                    </h4>
                    {user.isSuspended && user.suspendedUntil && (
                      <p className="text-sm text-gray-700 mt-1">
                        Suspended until: {new Date(user.suspendedUntil).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            {activityLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
              </div>
            ) : activity ? (
              <>
                {/* Activity Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Logins</p>
                    <p className="text-2xl font-bold text-gray-900">{activity.totalLogins}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Swipes</p>
                    <p className="text-2xl font-bold text-gray-900">{activity.totalSwipes}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Likes</p>
                    <p className="text-2xl font-bold text-gray-900">{activity.totalLikes}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Reports Made</p>
                    <p className="text-2xl font-bold text-gray-900">{activity.totalReports}</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Last Login</span>
                      <span className="font-medium">
                        {new Date(activity.lastLogin).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Last Active</span>
                      <span className="font-medium">
                        {new Date(activity.lastActive).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                {activity.deviceInfo && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Platform</p>
                        <p className="font-medium">{activity.deviceInfo.platform || 'Unknown'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Browser</p>
                        <p className="font-medium">{activity.deviceInfo.browser || 'Unknown'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Last IP</p>
                        <p className="font-medium font-mono text-sm">
                          {activity.deviceInfo.lastIP || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500 py-12">No activity data available</p>
            )}
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Subscription */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h3>
              <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FaCrown className="text-yellow-500 text-3xl" />
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">{user.subscription}</h4>
                      <p className="text-sm text-gray-600">Current Plan</p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full font-semibold ${getSubscriptionColor(user.subscription)}`}
                  >
                    {user.subscription === 'FREE' ? 'Free Tier' : 'Premium'}
                  </span>
                </div>

                {user.subscription !== 'FREE' && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-pink-200">
                    <div>
                      <p className="text-xs text-gray-600">Start Date</p>
                      <p className="font-medium">
                        {user.subscriptionStartDate
                          ? new Date(user.subscriptionStartDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">End Date</p>
                      <p className="font-medium">
                        {user.subscriptionEndDate
                          ? new Date(user.subscriptionEndDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Benefits</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Current tier benefits:</p>
                <ul className="space-y-2">
                  {user.subscription === 'FREE' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Basic matching features
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Limited daily swipes
                      </li>
                    </>
                  )}
                  {user.subscription === 'GOLD' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Unlimited swipes
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        See who liked you
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Monthly boost
                      </li>
                    </>
                  )}
                  {user.subscription === 'PLATINUM' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        All Gold features
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Priority likes
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Message before matching
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Incognito mode
                      </li>
                    </>
                  )}
                  {user.subscription === 'DIAMOND' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        All Platinum features
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        VIP badge
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Unlimited boosts
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        Priority support
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailView;
