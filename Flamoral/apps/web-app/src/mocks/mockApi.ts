// Mock API for development without backend
import { mockUsers, mockProfiles, mockMatches, mockConversations, mockLikes, mockStats } from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Current logged in user
let currentUser: any = null;
let profiles = [...mockProfiles];
let matches = [...mockMatches];
let conversations = [...mockConversations];

export const mockApi = {
  // Auth
  async login(email: string, password: string) {
    await delay(500);

    // Test user credentials mapping
    const credentials: Record<string, { password: string; userId: string }> = {
      'test1@flamoral.com': { password: 'TestUser1!', userId: 'test-user-1' },
      'test2@flamoral.com': { password: 'TestUser2!', userId: 'test-user-2' },
      'test3@flamoral.com': { password: 'TestUser3!', userId: 'test-user-3' },
      'test4@flamoral.com': { password: 'TestUser4!', userId: 'test-user-4' },
      'test5@flamoral.com': { password: 'TestUser5!', userId: 'test-user-5' },
    };

    const cred = credentials[email];
    if (cred && cred.password === password) {
      currentUser = mockUsers[cred.userId as keyof typeof mockUsers];
      const token = `mock-token-${cred.userId}`;
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      return { user: currentUser, token };
    }

    throw new Error('Invalid email or password');
  },

  async logout() {
    await delay(200);
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  },

  async getCurrentUser() {
    await delay(300);
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      currentUser = JSON.parse(stored);
      return currentUser;
    }
    throw new Error('Not authenticated');
  },

  // Recommendations
  async getRecommendations() {
    await delay(600);
    return {
      profiles: profiles.slice(0, 5),
      nextCursor: null,
      remainingToday: 50,
    };
  },

  // Swipe
  async swipe(targetUserId: string, action: 'like' | 'pass' | 'super_like') {
    await delay(400);

    // Remove from recommendations
    profiles = profiles.filter(p => p.userId !== targetUserId);

    // Simulate match (30% chance on like)
    const isMatch = action !== 'pass' && Math.random() > 0.7;

    if (isMatch) {
      const matchedProfile = mockProfiles.find(p => p.userId === targetUserId);
      const newMatch = {
        id: `match-${Date.now()}`,
        matchedUser: {
          id: targetUserId,
          name: matchedProfile?.name || 'New Match',
          photoUrl: matchedProfile?.photos[0] || '',
          isOnline: Math.random() > 0.5,
          premium_tier: 'free',
        },
        matchedAt: new Date().toISOString(),
        lastMessage: null as string | null,
        lastMessageAt: null as string | null,
        hasUnread: false,
      };
      matches.unshift(newMatch as typeof matches[0]);
    }

    return {
      isMatch,
      match: isMatch ? matches[0] : null,
      remainingLikes: mockStats.remainingLikes - 1,
      remainingSuperLikes: action === 'super_like' ? mockStats.remainingSuperLikes - 1 : mockStats.remainingSuperLikes,
    };
  },

  // Matches
  async getMatches() {
    await delay(400);
    return {
      matches,
      nextCursor: null,
      totalCount: matches.length,
    };
  },

  // Likes
  async getLikes() {
    await delay(400);
    return {
      likes: mockLikes,
      nextCursor: null,
      totalCount: mockLikes.length,
      canSeeLikes: currentUser?.subscription === 'premium',
    };
  },

  // Conversations
  async getConversations() {
    await delay(400);
    return {
      conversations: conversations.map(c => ({
        id: c.id,
        participant: c.participant,
        lastMessage: c.messages[c.messages.length - 1] ? {
          ...c.messages[c.messages.length - 1],
          status: c.messages[c.messages.length - 1].status as 'sending' | 'sent' | 'delivered' | 'read',
        } : undefined,
        unreadCount: c.unreadCount,
        createdAt: new Date().toISOString(),
      })),
      nextCursor: null,
      totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    };
  },

  async getMessages(conversationId: string) {
    await delay(300);
    const conv = conversations.find(c => c.id === conversationId);
    return {
      messages: (conv?.messages || []).map(m => ({
        ...m,
        status: m.status as 'sending' | 'sent' | 'delivered' | 'read',
      })),
      hasMore: false,
    };
  },

  async sendMessage(conversationId: string, content: string) {
    await delay(300);
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');

    const newMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUser?.id || 'test-user-1',
      content,
      sentAt: new Date().toISOString(),
      status: 'sent' as const,
    };

    conv.messages.push(newMessage);
    return newMessage;
  },

  // Stats
  async getStats() {
    await delay(200);
    return mockStats;
  },

  // Profile
  async updateProfile(data: any) {
    await delay(400);
    if (currentUser) {
      currentUser = { ...currentUser, ...data };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return currentUser;
  },
};

// Export for use in components
export default mockApi;
