/**
 * Reaction Picker Component
 * Allows users to react to messages with emojis
 */

import React, { useRef, useEffect } from 'react';

export interface Reaction {
  emoji: string;
  name: string;
  count?: number;
}

interface ReactionPickerProps {
  onSelect: (reaction: Reaction) => void;
  onClose: () => void;
  isOpen: boolean;
  position?: 'top' | 'bottom';
}

// Common reactions for dating app
const QUICK_REACTIONS: Reaction[] = [
  { emoji: '❤️', name: 'heart' },
  { emoji: '😍', name: 'heart_eyes' },
  { emoji: '😂', name: 'joy' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '😘', name: 'kissing_heart' },
  { emoji: '👍', name: 'thumbs_up' },
];

const ALL_REACTIONS: Reaction[] = [
  ...QUICK_REACTIONS,
  { emoji: '🥰', name: 'smiling_face_hearts' },
  { emoji: '😊', name: 'blush' },
  { emoji: '🤗', name: 'hugging' },
  { emoji: '😉', name: 'wink' },
  { emoji: '🙈', name: 'see_no_evil' },
  { emoji: '💕', name: 'two_hearts' },
  { emoji: '💗', name: 'growing_heart' },
  { emoji: '💋', name: 'kiss' },
  { emoji: '🌹', name: 'rose' },
  { emoji: '✨', name: 'sparkles' },
  { emoji: '🎉', name: 'tada' },
  { emoji: '👏', name: 'clap' },
  { emoji: '🤭', name: 'hand_over_mouth' },
  { emoji: '😏', name: 'smirk' },
  { emoji: '🥺', name: 'pleading' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '🤔', name: 'thinking' },
  { emoji: '💯', name: '100' },
  { emoji: '👀', name: 'eyes' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelect,
  onClose,
  isOpen,
  position = 'top',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = React.useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
        setShowAll(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        setShowAll(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleReactionSelect = (reaction: Reaction) => {
    onSelect(reaction);
    onClose();
    setShowAll(false);
  };

  if (!isOpen) return null;

  const positionClass = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      ref={containerRef}
      className={`absolute ${positionClass} left-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-scale-in`}
    >
      {showAll ? (
        // Full emoji grid
        <div className="p-2 w-64">
          <div className="grid grid-cols-6 gap-1">
            {ALL_REACTIONS.map((reaction) => (
              <button
                key={reaction.name}
                onClick={() => handleReactionSelect(reaction)}
                className="p-2 text-xl hover:bg-gray-100 rounded-lg transition-transform hover:scale-125"
                title={reaction.name}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAll(false)}
            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700"
          >
            Show less
          </button>
        </div>
      ) : (
        // Quick reactions bar
        <div className="flex items-center p-1 gap-0.5">
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction.name}
              onClick={() => handleReactionSelect(reaction)}
              className="p-2 text-xl hover:bg-gray-100 rounded-lg transition-transform hover:scale-125"
              title={reaction.name}
            >
              {reaction.emoji}
            </button>
          ))}
          <button
            onClick={() => setShowAll(true)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            title="More reactions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// Display component for showing reactions on a message
interface MessageReactionsProps {
  reactions: { emoji: string; count: number; userReacted: boolean }[];
  onReactionClick: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionClick,
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
            reaction.userReacted
              ? 'bg-pink-100 text-pink-700 border border-pink-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
