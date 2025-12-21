/**
 * Test Factories
 * Creates test data for unit and integration tests
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface UserData {
  id?: string;
  email?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_active?: boolean;
  stripe_customer_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ProfileData {
  id?: string;
  user_id: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  looking_for?: string[];
  interests?: string[];
  photos?: Photo[];
  location_lat?: number;
  location_lng?: number;
  location_city?: string;
}

interface Photo {
  id: string;
  url: string;
  order: number;
  is_primary: boolean;
}

interface MatchData {
  id?: string;
  user1_id: string;
  user2_id: string;
  matched_at?: Date;
  is_active?: boolean;
  last_message_at?: Date | null;
}

interface ConversationData {
  match_id: string;
  messages?: MessageData[];
}

interface MessageData {
  id?: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean;
  read_at?: Date | null;
  created_at?: Date;
  metadata?: Record<string, any>;
}

interface SwipeData {
  id?: string;
  swiper_id: string;
  swiped_id: string;
  direction: 'left' | 'right' | 'super';
  created_at?: Date;
}

interface SubscriptionData {
  id?: string;
  user_id: string;
  plan?: string;
  status?: string;
  start_date?: Date;
  end_date?: Date;
  stripe_subscription_id?: string;
  auto_renew?: boolean;
}

interface PaymentData {
  id?: string;
  user_id: string;
  amount: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  stripe_payment_intent_id?: string;
  metadata?: Record<string, any>;
}

// Factory class
export class TestFactory {
  private static counter = 0;

  /**
   * Generate unique ID
   */
  static generateId(): string {
    return uuidv4();
  }

  /**
   * Generate unique counter for email/username uniqueness
   */
  static getCounter(): number {
    return ++this.counter;
  }

  /**
   * Reset counter (call between test suites)
   */
  static resetCounter(): void {
    this.counter = 0;
  }

  /**
   * Create test user data
   */
  static createUser(overrides: Partial<UserData> = {}): UserData {
    const counter = this.getCounter();
    const now = new Date();

    return {
      id: this.generateId(),
      email: `testuser${counter}@example.com`,
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef', // bcrypt hash
      first_name: 'Test',
      last_name: `User${counter}`,
      date_of_birth: '1995-01-15',
      gender: 'male',
      phone_number: `+1555000${String(counter).padStart(4, '0')}`,
      is_email_verified: true,
      is_phone_verified: false,
      is_active: true,
      stripe_customer_id: `cus_test${counter}`,
      created_at: now,
      updated_at: now,
      ...overrides,
    };
  }

  /**
   * Create multiple test users
   */
  static createUsers(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array(count).fill(null).map(() => this.createUser(overrides));
  }

  /**
   * Create test profile data
   */
  static createProfile(userId: string, overrides: Partial<Omit<ProfileData, 'user_id'>> = {}): ProfileData {
    return {
      id: this.generateId(),
      user_id: userId,
      bio: 'Looking for meaningful connections. Love hiking, photography, and trying new cuisines.',
      occupation: 'Software Engineer',
      education: 'Masters in Computer Science',
      height: 175,
      looking_for: ['serious relationship', 'friendship'],
      interests: ['hiking', 'photography', 'cooking', 'travel', 'music'],
      photos: [
        {
          id: this.generateId(),
          url: 'https://storage.example.com/photos/profile1.jpg',
          order: 0,
          is_primary: true,
        },
        {
          id: this.generateId(),
          url: 'https://storage.example.com/photos/profile2.jpg',
          order: 1,
          is_primary: false,
        },
      ],
      location_lat: 40.7128,
      location_lng: -74.0060,
      location_city: 'New York, NY',
      ...overrides,
    };
  }

  /**
   * Create test match data
   */
  static createMatch(user1Id: string, user2Id: string, overrides: Partial<Omit<MatchData, 'user1_id' | 'user2_id'>> = {}): MatchData {
    // Ensure user1_id < user2_id for consistency
    const [orderedUser1, orderedUser2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    return {
      id: this.generateId(),
      user1_id: orderedUser1,
      user2_id: orderedUser2,
      matched_at: new Date(),
      is_active: true,
      last_message_at: null,
      ...overrides,
    };
  }

  /**
   * Create test message data
   */
  static createMessage(matchId: string, senderId: string, overrides: Partial<Omit<MessageData, 'match_id' | 'sender_id'>> = {}): MessageData {
    return {
      id: this.generateId(),
      match_id: matchId,
      sender_id: senderId,
      content: `Test message ${this.getCounter()}`,
      is_read: false,
      read_at: null,
      created_at: new Date(),
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Create test conversation (match with messages)
   */
  static createConversation(user1Id: string, user2Id: string, messageCount: number = 5): ConversationData {
    const match = this.createMatch(user1Id, user2Id);
    const messages: MessageData[] = [];

    for (let i = 0; i < messageCount; i++) {
      const senderId = i % 2 === 0 ? user1Id : user2Id;
      const messageTime = new Date();
      messageTime.setMinutes(messageTime.getMinutes() - (messageCount - i));

      messages.push(this.createMessage(match.id!, senderId, {
        content: `Message ${i + 1} in conversation`,
        created_at: messageTime,
      }));
    }

    return {
      match_id: match.id!,
      messages,
    };
  }

  /**
   * Create test swipe data
   */
  static createSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right' | 'super' = 'right', overrides: Partial<Omit<SwipeData, 'swiper_id' | 'swiped_id' | 'direction'>> = {}): SwipeData {
    return {
      id: this.generateId(),
      swiper_id: swiperId,
      swiped_id: swipedId,
      direction,
      created_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test subscription data
   */
  static createSubscription(userId: string, plan: string = 'premium', overrides: Partial<Omit<SubscriptionData, 'user_id'>> = {}): SubscriptionData {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    return {
      id: this.generateId(),
      user_id: userId,
      plan,
      status: 'active',
      start_date: startDate,
      end_date: endDate,
      stripe_subscription_id: `sub_test${this.getCounter()}`,
      auto_renew: true,
      ...overrides,
    };
  }

  /**
   * Create test payment data
   */
  static createPayment(userId: string, amount: number = 29.99, overrides: Partial<Omit<PaymentData, 'user_id' | 'amount'>> = {}): PaymentData {
    return {
      id: this.generateId(),
      user_id: userId,
      amount,
      currency: 'USD',
      status: 'completed',
      payment_method: 'card',
      stripe_payment_intent_id: `pi_test${this.getCounter()}`,
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Create test verification request data
   */
  static createVerificationRequest(userId: string, overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: this.generateId(),
      user_id: userId,
      pose_type: 'thumbs_up',
      status: 'pending',
      photo_url: null,
      submitted_at: null,
      processed_at: null,
      verified_at: null,
      created_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test call session data
   */
  static createCallSession(callerId: string, calleeId: string, overrides: Record<string, any> = {}): Record<string, any> {
    return {
      callId: this.generateId(),
      channelName: `flamoral_call_${this.generateId()}`,
      callerId,
      callerName: 'Caller',
      callerAvatar: 'https://storage.example.com/avatars/caller.jpg',
      calleeId,
      calleeName: 'Callee',
      callType: 'video',
      status: 'initiated',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      recordingEnabled: false,
      ...overrides,
    };
  }

  /**
   * Create test notification data
   */
  static createNotification(userId: string, type: string = 'match', overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: this.generateId(),
      user_id: userId,
      type,
      title: 'New Match!',
      body: 'You have a new match',
      data: {},
      is_read: false,
      created_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test report data
   */
  static createReport(reporterId: string, reportedId: string, overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: this.generateId(),
      reporter_id: reporterId,
      reported_user_id: reportedId,
      reason: 'inappropriate_content',
      description: 'Inappropriate messages',
      status: 'pending',
      created_at: new Date(),
      ...overrides,
    };
  }
}

// Convenience exports
export const createUser = TestFactory.createUser.bind(TestFactory);
export const createUsers = TestFactory.createUsers.bind(TestFactory);
export const createProfile = TestFactory.createProfile.bind(TestFactory);
export const createMatch = TestFactory.createMatch.bind(TestFactory);
export const createMessage = TestFactory.createMessage.bind(TestFactory);
export const createConversation = TestFactory.createConversation.bind(TestFactory);
export const createSwipe = TestFactory.createSwipe.bind(TestFactory);
export const createSubscription = TestFactory.createSubscription.bind(TestFactory);
export const createPayment = TestFactory.createPayment.bind(TestFactory);
export const createVerificationRequest = TestFactory.createVerificationRequest.bind(TestFactory);
export const createCallSession = TestFactory.createCallSession.bind(TestFactory);
export const createNotification = TestFactory.createNotification.bind(TestFactory);
export const createReport = TestFactory.createReport.bind(TestFactory);
export const resetFactoryCounter = TestFactory.resetCounter.bind(TestFactory);

export default TestFactory;
