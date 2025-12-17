import { v4 as uuidv4 } from 'uuid';

export const createMockUser = (overrides?: any) => ({
  id: uuidv4(),
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  ...overrides,
});

export const createMockMatch = (user1Id: string, user2Id: string, overrides?: any) => ({
  id: uuidv4(),
  user1_id: user1Id < user2Id ? user1Id : user2Id,
  user2_id: user1Id < user2Id ? user2Id : user1Id,
  matched_at: new Date(),
  is_active: true,
  ...overrides,
});

export const createMockMessage = (matchId: string, senderId: string, overrides?: any) => ({
  id: uuidv4(),
  match_id: matchId,
  sender_id: senderId,
  content: 'Test message',
  message_type: 'text',
  is_read: false,
  created_at: new Date(),
  ...overrides,
});

export const createMockConversation = (matchId: string, overrides?: any) => ({
  id: uuidv4(),
  match_id: matchId,
  last_message: 'Test message',
  last_message_at: new Date(),
  unread_count: 0,
  ...overrides,
});

export const createMockVideoCallSession = (matchId: string, callerId: string, overrides?: any) => ({
  id: uuidv4(),
  match_id: matchId,
  caller_id: callerId,
  channel_name: `call_${uuidv4()}`,
  status: 'pending',
  started_at: null,
  ended_at: null,
  created_at: new Date(),
  ...overrides,
});

export const createMultipleMockMessages = (matchId: string, senderId: string, count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage(matchId, senderId, {
      content: `Test message ${i + 1}`,
      created_at: new Date(Date.now() - i * 60000),
    })
  );
};
