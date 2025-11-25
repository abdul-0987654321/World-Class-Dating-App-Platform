/**
 * Incoming Call Notification
 * Toast-style notification for incoming calls on web
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallNotificationProps {
  isVisible: boolean;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  isVisible,
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onReject,
}) => {
  const [ringAnimation, setRingAnimation] = useState(true);

  useEffect(() => {
    if (isVisible) {
      // Play ringtone
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(() => {});

      // Pulse animation
      const interval = setInterval(() => {
        setRingAnimation((prev) => !prev);
      }, 500);

      return () => {
        audio.pause();
        clearInterval(interval);
      };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-red-500 p-4">
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
                    className="w-14 h-14 rounded-full border-2 border-white"
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
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"
                />
              </motion.div>

              <div className="flex-1">
                <p className="text-white font-semibold text-lg">{callerName}</p>
                <p className="text-white/80 text-sm">
                  {isVideoCall ? 'Video Call' : 'Voice Call'}
                </p>
              </div>

              <motion.div
                animate={{ rotate: ringAnimation ? [0, -15, 15, -15, 15, 0] : 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl"
              >
                {isVideoCall ? '📹' : '📞'}
              </motion.div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReject}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <span>✕</span>
              Decline
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAccept}
              className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <span>{isVideoCall ? '📹' : '📞'}</span>
              Accept
            </motion.button>
          </div>

          {/* Bottom progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 30, ease: 'linear' }}
            className="h-1 bg-pink-500"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallNotification;
