/**
 * Okta User Button Component
 *
 * Custom dropdown menu for authenticated users.
 * Replaces Clerk's UserButton with Okta integration.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  LogOut,
  Shield,
  Gift,
  Crown,
  Bell,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface OktaUserButtonProps {
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OktaUserButton: React.FC<OktaUserButtonProps> = ({
  showName = false,
  size = 'md',
}) => {
  const { authState, oktaAuth } = useOktaAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info from auth state
  const userInfo = authState?.idToken?.claims;
  const userName = userInfo?.name || userInfo?.preferred_username || 'User';
  const userEmail = userInfo?.email || '';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await oktaAuth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  if (!authState?.isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#D62839] focus:ring-offset-2"
      >
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#D62839] to-[#8B1E3F] flex items-center justify-center text-white font-semibold`}
        >
          {userInitials}
        </div>
        {showName && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
            {userName}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D62839] to-[#8B1E3F] flex items-center justify-center text-white font-semibold text-lg">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <User className="w-5 h-5 text-gray-400" />
              <span>My Profile</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Settings</span>
            </Link>

            <Link
              to="/subscription"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Subscription</span>
            </Link>

            <Link
              to="/rewards"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Gift className="w-5 h-5 text-purple-500" />
              <span>Rewards</span>
            </Link>

            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              <span>Notifications</span>
            </Link>

            <Link
              to="/safety"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Shield className="w-5 h-5 text-green-500" />
              <span>Safety Center</span>
            </Link>

            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-400" />
              <span>Help & Support</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OktaUserButton;
