/**
 * Incoming Call Notification
 * Toast-style notification for incoming calls on web
 * Note: Ringtone is handled by VideoCallContext to avoid duplication
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallNotificationProps {
  isVisible: boolean;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onReject: () => void;
  timeout?: number; // Auto-dismiss timeout in seconds
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  isVisible,
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onReject,
  timeout = 30,
}) => {
  const [ringAnimation, setRingAnimation] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(timeout);

  // Pulse animation for avatar
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setRingAnimation((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) {
      setTimeRemaining(timeout);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-reject when timeout
          onReject();
          return timeout;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, timeout, onReject]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onAccept, onReject]);

  const handleAccept = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAccept();
    },
    [onAccept]
  );

  const handleReject = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onReject();
    },
    [onReject]
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-[100] w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          role="alertdialog"
          aria-labelledby="caller-name"
          aria-describedby="call-type"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: ringAnimation ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {callerAvatar ? (
                  <img
                    src={callerAvatar}
                    alt={callerName}
                    className="w-14 h-14 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center border-2 border-white">
                    <span className="text-2xl font-bold text-white">
                      {callerName[0]?.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Ringing indicator */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
                />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p id="caller-name" className="text-white font-semibold text-lg truncate">
                  {callerName}
                </p>
                <p id="call-type" className="text-white/80 text-sm">
                  {isVideoCall ? 'Video Call' : 'Voice Call'}
                </p>
              </div>

              <motion.div
                animate={{ rotate: ringAnimation ? [0, -15, 15, -15, 15, 0] : 0 }}
                transition={{ duration: 0.5 }}
                className="flex-shrink-0"
              >
                {isVideoCall ? (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path
                      fill="currentColor"
                      d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path
                      fill="currentColor"
                      d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                    />
                  </svg>
                )}
              </motion.div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReject}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500">
                <path
                  fill="currentColor"
                  d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
                />
              </svg>
              <span>Decline</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAccept}
              className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
            >
              {isVideoCall ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="currentColor"
                    d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="currentColor"
                    d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                  />
                </svg>
              )}
              <span>Accept</span>
            </motion.button>
          </div>

          {/* Bottom progress bar showing timeout */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${(timeRemaining / timeout) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className="h-1 bg-gradient-to-r from-pink-500 to-purple-600"
          />

          {/* Keyboard hint */}
          <div className="px-4 pb-3 flex justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 font-mono">
                Enter
              </kbd>{' '}
              to accept
            </span>
            <span>
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 font-mono">
                Esc
              </kbd>{' '}
              to decline
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallNotification;
