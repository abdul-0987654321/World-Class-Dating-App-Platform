/**
 * Event Card Component
 * Card for displaying event previews in list/grid
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: Date;
  time: string;
  location: {
    name: string;
    city: string;
  };
  category: string;
  attendeeCount: number;
  maxAttendees: number;
  price: number;
  isAttending?: boolean;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'speed-dating': '⚡',
  'singles-mixer': '🎉',
  'outdoor': '🌳',
  'cooking': '👨‍🍳',
  'wine-tasting': '🍷',
  'game-night': '🎮',
  'fitness': '💪',
  'arts': '🎨',
  'virtual': '💻',
};

const CATEGORY_LABELS: Record<string, string> = {
  'speed-dating': 'Speed Dating',
  'singles-mixer': 'Mixer',
  'outdoor': 'Outdoor',
  'cooking': 'Cooking',
  'wine-tasting': 'Wine',
  'game-night': 'Games',
  'fitness': 'Fitness',
  'arts': 'Arts',
  'virtual': 'Virtual',
};

const EventCard: React.FC<EventCardProps> = ({
  id,
  title,
  description,
  imageUrl,
  date,
  time,
  location,
  category,
  attendeeCount,
  maxAttendees,
  price,
  isAttending = false,
  isBookmarked = false,
  onBookmark,
}) => {
  const formatDate = (d: Date): string => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const spotsLeft = maxAttendees - attendeeCount;
  const isAlmostFull = spotsLeft <= 5;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden group"
    >
      <Link to={`/events/${id}`}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Category badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 px-3 py-1 rounded-full">
            <span>{CATEGORY_EMOJIS[category] || '📅'}</span>
            <span className="text-sm font-medium text-gray-800">
              {CATEGORY_LABELS[category] || category}
            </span>
          </div>

          {/* Attending badge */}
          {isAttending && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Going ✓
            </div>
          )}

          {/* Bookmark button */}
          {!isAttending && onBookmark && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmark(id);
              }}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition"
            >
              <span className="text-lg">{isBookmarked ? '❤️' : '🤍'}</span>
            </button>
          )}

          {/* Almost full indicator */}
          {isAlmostFull && !isAttending && (
            <div className="absolute bottom-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Only {spotsLeft} spots left!
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-pink-500 font-semibold">{formatDate(date)}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{time}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-pink-500 transition">
            {title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
            <span>📍</span>
            <span className="line-clamp-1">
              {location.name}, {location.city}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {/* Attendees */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"
                  >
                    <span className="text-xs">👤</span>
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {attendeeCount}/{maxAttendees}
              </span>
            </div>

            {/* Price */}
            <div className="bg-gray-100 px-3 py-1 rounded-lg">
              <span className="font-bold text-gray-900">
                {price === 0 ? 'Free' : `$${price}`}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;
