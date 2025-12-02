import React, { useState } from 'react';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { UserManagementDashboard } from './UserManagementDashboard';
import {
  UserDetailView,
  UserModerationActions,
  UserReportsView,
  UserEditForm,
  UserMatchesView,
  SubscriptionManagement,
} from '../../components/Admin';
import type { AdminUser } from '../../services/admin-user.service';

export const UserManagementPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeSection, setActiveSection] = useState<
    'overview' | 'moderation' | 'reports' | 'edit' | 'matches' | 'subscription'
  >('overview');

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActiveSection('overview');
  };

  const handleCloseUserView = () => {
    setSelectedUser(null);
    setActiveSection('overview');
  };

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'edit', label: 'Edit Profile' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'reports', label: 'Reports' },
    { id: 'matches', label: 'Matches & Conversations' },
    { id: 'subscription', label: 'Subscription' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage users, moderation, and subscriptions
              </p>
            </div>
            {selectedUser && (
              <button
                onClick={handleCloseUserView}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <FaArrowLeft />
                Back to List
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedUser ? (
          /* User List View */
          <UserManagementDashboard onSelectUser={handleSelectUser} />
        ) : (
          /* User Detail View */
          <div className="space-y-6">
            {/* User Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {selectedUser.profilePhoto ? (
                    <img
                      src={selectedUser.profilePhoto}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                      {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500 mt-1">ID: {selectedUser.id}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseUserView}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                        activeSection === section.id
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {section.label}
                      {section.id === 'reports' && selectedUser.reportCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                          {selectedUser.reportCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">
                {activeSection === 'overview' && (
                  <UserDetailView userId={selectedUser.id} />
                )}

                {activeSection === 'edit' && (
                  <UserEditForm
                    user={selectedUser}
                    onSave={() => {
                      // Optionally refresh user data
                      console.log('User updated');
                    }}
                  />
                )}

                {activeSection === 'moderation' && (
                  <UserModerationActions
                    user={selectedUser}
                    onActionComplete={() => {
                      // Optionally refresh user data
                      console.log('Moderation action completed');
                    }}
                  />
                )}

                {activeSection === 'reports' && (
                  <UserReportsView userId={selectedUser.id} />
                )}

                {activeSection === 'matches' && (
                  <UserMatchesView userId={selectedUser.id} />
                )}

                {activeSection === 'subscription' && (
                  <SubscriptionManagement
                    user={selectedUser}
                    onUpdate={() => {
                      // Optionally refresh user data
                      console.log('Subscription updated');
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserManagementPage;
