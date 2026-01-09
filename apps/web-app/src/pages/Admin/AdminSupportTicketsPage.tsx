import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'abuse' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  messages: {
    id: string;
    senderId: string;
    senderType: 'user' | 'admin';
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export const AdminSupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'waiting_user' | 'resolved'>('open');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/tickets?status=${filter !== 'all' ? filter : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.data?.tickets || []);
      } else {
        // Mock data
        setTickets([
          {
            id: '1',
            userId: 'user1',
            userEmail: 'alex@example.com',
            userName: 'Alex Johnson',
            subject: 'Cannot upload profile photos',
            description: 'When I try to upload photos, I get an error message saying "Upload failed". I\'ve tried multiple times with different photos.',
            category: 'technical',
            priority: 'high',
            status: 'open',
            messages: [],
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            userId: 'user2',
            userEmail: 'sarah@example.com',
            userName: 'Sarah Williams',
            subject: 'Charged twice for subscription',
            description: 'I was charged $29.99 twice on the same day for my Platinum subscription. Please refund one charge.',
            category: 'billing',
            priority: 'urgent',
            status: 'in_progress',
            assignedToName: 'Support Team',
            messages: [
              { id: '1', senderId: 'admin1', senderType: 'admin', content: 'We\'re looking into this. Can you provide your transaction IDs?', createdAt: new Date(Date.now() - 1800000).toISOString() },
            ],
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            updatedAt: new Date(Date.now() - 1800000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/admin/tickets/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      } else {
        setStats({
          open: 15,
          inProgress: 8,
          waitingUser: 5,
          resolved: 143,
          avgResponseTime: 3600,
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleAssign = async (ticketId: string) => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchTickets();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) return;

    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: replyMessage }),
      });

      setReplyMessage('');
      fetchTickets();
      if (selectedTicket) {
        const updatedTicket = await (await fetch(`/api/admin/tickets/${ticketId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })).json();
        setSelectedTicket(updatedTicket.data);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
      setSelectedTicket(null);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-600',
      in_progress: 'bg-purple-100 text-purple-600',
      waiting_user: 'bg-yellow-100 text-yellow-600',
      resolved: 'bg-green-100 text-green-600',
      closed: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.open;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      technical: '🔧',
      billing: '💳',
      account: '👤',
      abuse: '🚨',
      other: '❓',
    };
    return icons[category] || '📝';
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin' },
              { name: 'Users', path: '/admin/users' },
              { name: 'Support', path: '/admin/support', active: true },
              { name: 'Settings', path: '/admin/settings' },
            ].map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`py-4 px-2 border-b-2 whitespace-nowrap ${
                  item.active
                    ? 'border-pink-500 text-pink-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-purple-500">{stats.inProgress}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Waiting User</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.waitingUser}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Avg Response</p>
              <p className="text-2xl font-bold text-gray-800">{Math.round(stats.avgResponseTime / 60)}m</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'open', 'in_progress', 'waiting_user', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-2xl">{getCategoryIcon(ticket.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{ticket.subject}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>From: {ticket.userName}</span>
                        <span>•</span>
                        <span>{formatTime(ticket.createdAt)}</span>
                        {ticket.assignedToName && (
                          <>
                            <span>•</span>
                            <span>Assigned to: {ticket.assignedToName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {ticket.status === 'open' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssign(ticket.id);
                      }}
                      className="px-3 py-1 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                    >
                      Assign to Me
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedTicket.subject}</h3>
                <p className="text-gray-500">{selectedTicket.userName} ({selectedTicket.userEmail})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Original Message */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{selectedTicket.description}</p>
                <p className="text-sm text-gray-400 mt-2">{formatTime(selectedTicket.createdAt)}</p>
              </div>

              {/* Messages */}
              <div className="space-y-4 mb-6">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.senderType === 'admin' ? 'bg-pink-50 ml-8' : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {msg.senderType === 'admin' ? 'You' : selectedTicket.userName}
                    </p>
                    <p className="text-gray-800">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatTime(msg.createdAt)}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="mb-6">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  rows={4}
                />
                <button
                  onClick={() => handleReply(selectedTicket.id)}
                  disabled={!replyMessage.trim()}
                  className="mt-2 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportTicketsPage;
