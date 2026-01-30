import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaComments, FaClock, FaBan, FaUser, FaEnvelope, FaExternalLinkAlt } from 'react-icons/fa';
import { useUserMatches, useUserConversations } from '../../hooks/useAdminUsers';

interface UserMatchesViewProps {
  userId: string;
}

export const UserMatchesView: React.FC<UserMatchesViewProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'matches' | 'conversations'>('matches');

  const { data: matches, isLoading: matchesLoading } = useUserMatches(
    userId,
    activeTab === 'matches'
  );
  const { data: conversations, isLoading: conversationsLoading } = useUserConversations(
    userId,
    activeTab === 'conversations'
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-4 font-medium transition relative ${
            activeTab === 'matches'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaHeart className="inline mr-2" />
          Matches
          {matches && (
            <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-xs">
              {matches.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={`pb-3 px-4 font-medium transition relative ${
            activeTab === 'conversations'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaComments className="inline mr-2" />
          Conversations
          {conversations && (
            <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-xs">
              {conversations.length}
            </span>
          )}
        </button>
      </div>

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div>
          {matchesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : !matches || matches.length === 0 ? (
            <div className="text-center py-12">
              <FaHeart className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No matches found</p>
              <p className="text-gray-400 text-sm mt-2">This user hasn't matched with anyone yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`bg-white border rounded-lg p-4 hover:shadow-md transition ${
                    match.isBlocked ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {match.matchedUser.profilePhoto ? (
                        <img
                          src={match.matchedUser.profilePhoto}
                          alt={`${match.matchedUser.firstName} ${match.matchedUser.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {match.matchedUser.firstName[0]}
                          {match.matchedUser.lastName[0]}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {match.matchedUser.firstName} {match.matchedUser.lastName}
                          </h4>
                          {match.isBlocked && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                              <FaBan className="inline mr-1" />
                              Blocked
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">ID: {match.matchedUser.id}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <FaClock />
                            Matched {formatTimeAgo(match.matchedAt)}
                          </span>
                          {match.messageCount > 0 && (
                            <span className="flex items-center gap-1">
                              <FaComments />
                              {match.messageCount} messages
                            </span>
                          )}
                        </div>
                        {match.lastMessageAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last message: {formatTimeAgo(match.lastMessageAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 text-sm text-pink-600 hover:bg-pink-50 rounded-lg transition"
                      onClick={() => {
                        // Navigate to user detail or open modal
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div>
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="text-center py-12">
              <FaComments className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No conversations found</p>
              <p className="text-gray-400 text-sm mt-2">
                This user hasn't started any conversations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-pink-500" />
                      <h4 className="font-semibold text-gray-900">Conversation</h4>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                        {conversation.messageCount} messages
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(conversation.updatedAt)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaUser className="text-gray-400" />
                      <span>{conversation.participants.length} participants</span>
                    </div>

                    {conversation.lastMessage && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last message:</p>
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {conversation.lastMessage.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(conversation.lastMessage.timestamp)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Started {formatTimeAgo(conversation.createdAt)}
                      </span>
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm text-pink-600 hover:bg-pink-50 rounded-lg transition font-medium"
                        onClick={() => navigate(`/messages?conversation=${conversation.id}`)}
                      >
                        <FaExternalLinkAlt className="text-xs" />
                        View Full Thread
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {((activeTab === 'matches' && matches) ||
        (activeTab === 'conversations' && conversations)) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {activeTab === 'matches' ? 'Match Statistics' : 'Conversation Statistics'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeTab === 'matches' && matches && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
                  <p className="text-xs text-gray-600">Total Matches</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {matches.filter((m) => m.messageCount > 0).length}
                  </p>
                  <p className="text-xs text-gray-600">Active Chats</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {matches.filter((m) => m.messageCount === 0).length}
                  </p>
                  <p className="text-xs text-gray-600">No Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {matches.filter((m) => m.isBlocked).length}
                  </p>
                  <p className="text-xs text-gray-600">Blocked</p>
                </div>
              </>
            )}
            {activeTab === 'conversations' && conversations && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
                  <p className="text-xs text-gray-600">Total Conversations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-600">
                    {conversations.reduce((sum, c) => sum + c.messageCount, 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {conversations.filter((c) => c.lastMessage).length}
                  </p>
                  <p className="text-xs text-gray-600">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {Math.round(
                      conversations.reduce((sum, c) => sum + c.messageCount, 0) /
                        conversations.length
                    ) || 0}
                  </p>
                  <p className="text-xs text-gray-600">Avg Messages</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMatchesView;
