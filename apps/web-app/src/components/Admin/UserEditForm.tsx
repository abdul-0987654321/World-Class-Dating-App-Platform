import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaEdit, FaShieldAlt } from 'react-icons/fa';
import { useUpdateUser, useVerifyUser } from '../../hooks/useAdminUsers';
import type { AdminUser, UpdateUserRequest } from '../../services/admin-user.service';

interface UserEditFormProps {
  user: AdminUser;
  onSave?: () => void;
  onCancel?: () => void;
}

export const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSave, onCancel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateUserRequest>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    bio: user.bio || '',
    age: user.age,
    gender: user.gender,
    location: user.location,
  });

  const updateUserMutation = useUpdateUser();
  const verifyUserMutation = useVerifyUser();

  useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio || '',
      age: user.age,
      gender: user.gender,
      location: user.location,
    });
  }, [user]);

  const handleChange = (field: keyof UpdateUserRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only send changed fields
    const updates: Partial<UpdateUserRequest> = {};
    (Object.keys(formData) as Array<keyof UpdateUserRequest>).forEach((key) => {
      const originalValue = user[key as keyof typeof user];
      const newValue = formData[key];

      // Check if value has changed
      if (originalValue !== newValue && newValue !== '' && newValue !== undefined) {
        (updates as Record<string, unknown>)[key] = newValue;
      }
    });

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    await updateUserMutation.mutateAsync({
      userId: user.id,
      data: updates as UpdateUserRequest,
    });

    setIsEditing(false);
    onSave?.();
  };

  const handleVerify = async () => {
    if (window.confirm(`Are you sure you want to verify ${user.firstName} ${user.lastName}?`)) {
      await verifyUserMutation.mutateAsync(user.id);
      onSave?.();
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio || '',
      age: user.age,
      gender: user.gender,
      location: user.location,
    });
    setIsEditing(false);
    onCancel?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaEdit className="text-pink-500 text-xl" />
          <h3 className="text-lg font-semibold text-gray-900">Edit User Information</h3>
        </div>
        <div className="flex items-center gap-2">
          {!user.isVerified && (
            <button
              onClick={handleVerify}
              disabled={verifyUserMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              <FaShieldAlt />
              {verifyUserMutation.isPending ? 'Verifying...' : 'Verify User'}
            </button>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={!isEditing}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              disabled={!isEditing}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!isEditing}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age
            </label>
            <input
              type="number"
              min="18"
              max="100"
              value={formData.age || ''}
              onChange={(e) => handleChange('age', parseInt(e.target.value) || undefined)}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              value={formData.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value || undefined)}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value || undefined)}
              disabled={!isEditing}
              placeholder="City, State/Country"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Bio */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => handleChange('bio', e.target.value || undefined)}
              disabled={!isEditing}
              rows={4}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50 disabled:text-gray-600"
            />
            <p className="mt-1 text-xs text-gray-500">
              {(formData.bio?.length || 0)} / 500 characters
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateUserMutation.isPending}
              className="flex-1 md:flex-none px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
            >
              <FaTimes className="inline mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateUserMutation.isPending}
              className="flex-1 md:flex-none px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition disabled:opacity-50"
            >
              <FaSave className="inline mr-2" />
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Info Message */}
        {isEditing && (
          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <p className="text-sm text-blue-700">
              Changes will be saved immediately and the user will be notified via email.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserEditForm;
