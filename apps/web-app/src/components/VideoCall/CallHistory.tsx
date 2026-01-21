/**
 * Call History Component
 * Displays a list of past video and voice calls
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CallHistoryItem {
  callId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  callType: 'video' | 'audio';
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'rejected' | 'failed';
  duration: number; // in seconds
  timestamp: Date;
}

interface CallHistoryProps {
  calls: CallHistoryItem[];
  isLoading?: boolean;
  onCallBack: (participantId: string, participantName: string, callType: 'video' | 'audio') => void;
  onDeleteCall?: (callId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const CallHistory: React.FC<CallHistoryProps> = ({
  calls,
  isLoading = false,
  onCallBack,
  onDeleteCall,
  onLoadMore,
  hasMore = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed' | 'video' | 'audio'>('all');
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  // Filter calls based on selected filter
  const filteredCalls = calls.filter((call) => {
    switch (filter) {
      case 'missed':
        return call.status === 'missed';
      case 'video':
        return call.callType === 'video';
      case 'audio':
        return call.callType === 'audio';
      default:
        return true;
    }
  });

  // Group calls by date
  const groupedCalls = filteredCalls.reduce(
    (groups, call) => {
      const date = new Date(call.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(call);
      return groups;
    },
    {} as Record<string, CallHistoryItem[]>
  );

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '-';
    if (seconds < 60) return `${seconds}s`;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins < 60) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }

    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Format time
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get call icon based on type and status
  const getCallIcon = (call: CallHistoryItem) => {
    const isIncoming = call.direction === 'incoming';
    const isMissed = call.status === 'missed' || call.status === 'rejected';

    if (call.callType === 'video') {
      return (
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isMissed ? 'bg-red-100' : 'bg-blue-100'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-5 h-5 ${isMissed ? 'text-red-500' : 'text-blue-500'}`}
          >
            <path
              fill="currentColor"
              d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
            />
          </svg>
        </div>
      );
    }

    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isMissed ? 'bg-red-100' : 'bg-green-100'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 ${isMissed ? 'text-red-500' : 'text-green-500'}`}
        >
          {isIncoming ? (
            <path
              fill="currentColor"
              d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2c0-4.97-4.03-9-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z"
            />
          ) : (
            <path
              fill="currentColor"
              d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
            />
          )}
        </svg>
      </div>
    );
  };

  // Get status label
  const getStatusLabel = (call: CallHistoryItem): string => {
    if (call.status === 'missed') {
      return call.direction === 'incoming' ? 'Missed' : 'No answer';
    }
    if (call.status === 'rejected') {
      return call.direction === 'incoming' ? 'Declined' : 'Busy';
    }
    if (call.status === 'failed') {
      return 'Failed';
    }
    return call.direction === 'incoming' ? 'Incoming' : 'Outgoing';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Call History</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'missed', label: 'Missed' },
            { key: 'video', label: 'Video' },
            { key: 'audio', label: 'Audio' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                filter === key
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && calls.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <svg viewBox="0 0 24 24" className="w-16 h-16 mb-4 opacity-50">
              <path
                fill="currentColor"
                d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
              />
            </svg>
            <p className="text-lg font-medium">No calls yet</p>
            <p className="text-sm">Your call history will appear here</p>
          </div>
        ) : (
          Object.entries(groupedCalls).map(([date, dateCalls]) => (
            <div key={date}>
              {/* Date header */}
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-800/50 px-4 py-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{date}</span>
              </div>

              {/* Calls for this date */}
              {dateCalls.map((call, index) => (
                <motion.div
                  key={call.callId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                    onClick={() =>
                      setSelectedCall(selectedCall === call.callId ? null : call.callId)
                    }
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {call.participantAvatar ? (
                        <img
                          src={call.participantAvatar}
                          alt={call.participantName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {call.participantName[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Call type badge */}
                      <div className="absolute -bottom-1 -right-1">{getCallIcon(call)}</div>
                    </div>

                    {/* Call info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium truncate ${
                            call.status === 'missed' || call.status === 'rejected'
                              ? 'text-red-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {call.participantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{getStatusLabel(call)}</span>
                        <span>-</span>
                        <span>{formatDuration(call.duration)}</span>
                      </div>
                    </div>

                    {/* Time and actions */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(call.timestamp)}
                      </span>

                      {/* Call back button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCallBack(call.participantId, call.participantName, call.callType);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-pink-500">
                          <path
                            fill="currentColor"
                            d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {selectedCall === call.callId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50 dark:bg-gray-800/30"
                      >
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex gap-4">
                            <button
                              onClick={() =>
                                onCallBack(call.participantId, call.participantName, 'video')
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm transition"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path
                                  fill="currentColor"
                                  d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                                />
                              </svg>
                              Video Call
                            </button>
                            <button
                              onClick={() =>
                                onCallBack(call.participantId, call.participantName, 'audio')
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm transition"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path
                                  fill="currentColor"
                                  d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                                />
                              </svg>
                              Voice Call
                            </button>
                          </div>

                          {onDeleteCall && (
                            <button
                              onClick={() => onDeleteCall(call.callId)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                            >
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                <path
                                  fill="currentColor"
                                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ))
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistory;
