/**
 * Incoming Call Modal Component
 * Displays incoming call notification with accept/reject options
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPhone, FaPhoneSlash, FaVideo } from 'react-icons/fa6';

interface IncomingCallModalProps {
  isOpen: boolean;
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'audio';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  callId,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}) => {
  const [isPulsing, setIsPulsing] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone
  useEffect(() => {
    if (isOpen) {
      // In a real app, load an actual ringtone audio file
      audioRef.current = new Audio('/sounds/ringtone.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(console.error);

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="incoming-call-modal-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          className="incoming-call-modal"
        >
          {/* Caller Info */}
          <div className="caller-info">
            <motion.div
              animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="caller-avatar-container"
            >
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} className="caller-avatar" />
              ) : (
                <div className="caller-avatar-placeholder">
                  <span>{callerName[0]?.toUpperCase()}</span>
                </div>
              )}
            </motion.div>

            <h2 className="caller-name">{callerName}</h2>
            <p className="call-type-text">
              {callType === 'video' ? (
                <>
                  <FaVideo /> Video Call
                </>
              ) : (
                <>
                  <FaPhone /> Voice Call
                </>
              )}
            </p>
            <p className="call-status">Incoming call...</p>
          </div>

          {/* Action Buttons */}
          <div className="call-actions">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="call-action-button reject"
              onClick={onReject}
            >
              <div className="button-icon">
                <FaPhoneSlash />
              </div>
              <span className="button-label">Decline</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="call-action-button accept"
              onClick={onAccept}
            >
              <div className="button-icon">{callType === 'video' ? <FaVideo /> : <FaPhone />}</div>
              <span className="button-label">Accept</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallModal;
