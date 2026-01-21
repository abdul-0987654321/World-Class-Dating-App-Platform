/**
 * MessageBubbleAnimated - Smooth Message Animation Components
 *
 * Features:
 * - Staggered message entry animations
 * - Typing indicator with smooth dots
 * - Read receipt animations
 * - Optimized for long message lists
 *
 * @package @flamoral/web
 */

import React, { memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../constants/animations';

// ============================================================================
// TYPES
// ============================================================================

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  status?: MessageStatus;
  type?: 'text' | 'image' | 'gif' | 'voice';
  mediaUrl?: string;
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onImageClick?: (url: string) => void;
}

export interface TypingIndicatorProps {
  userName?: string;
  userPhoto?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const messageBubbleVariants: Variants = {
  initial: (isOwn: boolean) => ({
    opacity: 0,
    scale: 0.8,
    x: isOwn ? 20 : -20,
    y: 10,
  }),
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.15,
    },
  },
};

const statusVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 200,
    },
  },
};

const typingDotVariants: Variants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [-2, 2, -2],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      delay: i * 0.15,
      ease: 'easeInOut',
    },
  }),
};

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

export const MessageBubbleAnimated = memo<MessageBubbleProps>(
  ({
    message,
    isOwn,
    showTimestamp = false,
    isFirstInGroup = true,
    isLastInGroup = true,
    onImageClick,
  }) => {
    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    };

    const renderStatus = () => {
      if (!isOwn || !message.status) return null;

      const statusConfig = {
        sending: { icon: '...', color: 'text-gray-400' },
        sent: { icon: '\u2713', color: 'text-gray-400' },
        delivered: { icon: '\u2713\u2713', color: 'text-gray-400' },
        read: { icon: '\u2713\u2713', color: 'text-pink-500' },
      };

      const config = statusConfig[message.status];

      return (
        <motion.span
          className={`text-xs ${config.color} ml-1`}
          variants={statusVariants}
          initial="initial"
          animate="animate"
          key={message.status}
        >
          {config.icon}
        </motion.span>
      );
    };

    const bubbleClasses = `
    relative max-w-[80%] md:max-w-[60%]
    ${isOwn ? 'ml-auto' : 'mr-auto'}
  `;

    const bubbleContentClasses = `
    px-4 py-2.5 break-words
    ${isOwn ? 'bg-pink-500 text-white' : 'bg-white text-gray-800 shadow-sm'}
    ${
      isFirstInGroup && isLastInGroup
        ? 'rounded-2xl'
        : isFirstInGroup
          ? isOwn
            ? 'rounded-2xl rounded-br-md'
            : 'rounded-2xl rounded-bl-md'
          : isLastInGroup
            ? isOwn
              ? 'rounded-2xl rounded-tr-md'
              : 'rounded-2xl rounded-tl-md'
            : isOwn
              ? 'rounded-2xl rounded-r-md'
              : 'rounded-2xl rounded-l-md'
    }
  `;

    return (
      <motion.div
        className={bubbleClasses}
        variants={messageBubbleVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={isOwn}
        layout
      >
        {/* Text Message */}
        {message.type === 'text' || !message.type ? (
          <div className={bubbleContentClasses}>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
            <div
              className={`
            flex items-center justify-end gap-1 mt-1
            ${isOwn ? 'text-white/70' : 'text-gray-400'}
          `}
            >
              <span className="text-[10px]">{formatTime(message.timestamp)}</span>
              {renderStatus()}
            </div>
          </div>
        ) : null}

        {/* Image Message */}
        {message.type === 'image' && message.mediaUrl && (
          <motion.div
            className="relative overflow-hidden rounded-2xl cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onImageClick?.(message.mediaUrl!)}
          >
            <img
              src={message.mediaUrl}
              alt="Shared image"
              className="max-w-[280px] max-h-[280px] object-cover"
              loading="lazy"
            />
            <div
              className={`
            absolute bottom-2 right-2 px-2 py-1 rounded-full
            flex items-center gap-1
            ${isOwn ? 'bg-pink-600/80' : 'bg-black/50'}
          `}
            >
              <span className="text-white text-[10px]">{formatTime(message.timestamp)}</span>
              {renderStatus()}
            </div>
          </motion.div>
        )}

        {/* GIF Message */}
        {message.type === 'gif' && message.mediaUrl && (
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={message.mediaUrl}
              alt="GIF"
              className="max-w-[280px] max-h-[280px] object-cover"
              loading="lazy"
            />
            <div
              className={`
            absolute bottom-2 right-2 px-2 py-1 rounded-full
            flex items-center gap-1
            ${isOwn ? 'bg-pink-600/80' : 'bg-black/50'}
          `}
            >
              <span className="text-white text-[10px]">{formatTime(message.timestamp)}</span>
              {renderStatus()}
            </div>
          </div>
        )}

        {/* Timestamp separator */}
        {showTimestamp && (
          <motion.div
            className="text-center text-gray-400 text-xs my-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(message.timestamp)}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

MessageBubbleAnimated.displayName = 'MessageBubbleAnimated';

// ============================================================================
// TYPING INDICATOR COMPONENT
// ============================================================================

export const TypingIndicator = memo<TypingIndicatorProps>(({ userName, userPhoto }) => {
  return (
    <motion.div
      className="flex items-end gap-2 mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300,
      }}
    >
      {userPhoto && (
        <img
          src={userPhoto}
          alt={userName || 'User'}
          className="w-8 h-8 rounded-full object-cover"
        />
      )}

      <div className="bg-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              variants={typingDotVariants}
              initial="initial"
              animate="animate"
              custom={i}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// ============================================================================
// MESSAGE LIST COMPONENT (Optimized for performance)
// ============================================================================

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isTyping?: boolean;
  typingUser?: { name: string; photo: string };
  onImageClick?: (url: string) => void;
}

export const MessageListAnimated = memo<MessageListProps>(
  ({ messages, currentUserId, isTyping, typingUser, onImageClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(messages.length);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
      if (messages.length > prevMessageCountRef.current && containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    // Group messages by sender and time proximity
    const groupedMessages = React.useMemo(() => {
      return messages.map((message, index) => {
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];

        const isFirstInGroup =
          !prevMessage ||
          prevMessage.senderId !== message.senderId ||
          message.timestamp.getTime() - prevMessage.timestamp.getTime() > 60000;

        const isLastInGroup =
          !nextMessage ||
          nextMessage.senderId !== message.senderId ||
          nextMessage.timestamp.getTime() - message.timestamp.getTime() > 60000;

        // Show timestamp if more than 30 minutes gap
        const showTimestamp =
          !prevMessage || message.timestamp.getTime() - prevMessage.timestamp.getTime() > 1800000;

        return {
          ...message,
          isFirstInGroup,
          isLastInGroup,
          showTimestamp,
        };
      });
    }, [messages]);

    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{
          overscrollBehavior: 'contain',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {groupedMessages.map((message) => (
            <MessageBubbleAnimated
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
              isFirstInGroup={message.isFirstInGroup}
              isLastInGroup={message.isLastInGroup}
              showTimestamp={message.showTimestamp}
              onImageClick={onImageClick}
            />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && typingUser && (
            <TypingIndicator userName={typingUser.name} userPhoto={typingUser.photo} />
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MessageListAnimated.displayName = 'MessageListAnimated';

// ============================================================================
// SEND BUTTON ANIMATION
// ============================================================================

export interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const SendButtonAnimated = memo<SendButtonProps>(
  ({ onClick, disabled = false, isLoading = false }) => {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        ${
          disabled || isLoading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-pink-500 text-white hover:bg-pink-600'
        }
        transition-colors
      `}
        whileHover={!disabled && !isLoading ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.95 } : {}}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          ) : (
            <motion.svg
              key="send"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              initial={{ opacity: 0, scale: 0.5, x: -5 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 5 }}
              transition={{ duration: 0.15 }}
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

SendButtonAnimated.displayName = 'SendButtonAnimated';

export default MessageBubbleAnimated;
