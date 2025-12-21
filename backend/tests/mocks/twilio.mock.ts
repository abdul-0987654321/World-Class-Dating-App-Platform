/**
 * Mock Twilio for Call/SMS Tests
 * Simulates Twilio API behavior for testing
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface MockCall {
  sid: string;
  accountSid: string;
  from: string;
  to: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  direction: 'outbound-api' | 'inbound';
  duration: number | null;
  startTime: Date | null;
  endTime: Date | null;
  price: string | null;
  priceUnit: string;
}

interface MockMessage {
  sid: string;
  accountSid: string;
  from: string;
  to: string;
  body: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  direction: 'outbound-api' | 'inbound';
  numSegments: string;
  price: string | null;
  priceUnit: string;
  errorCode: string | null;
  errorMessage: string | null;
  dateCreated: Date;
  dateSent: Date | null;
}

interface MockVerification {
  sid: string;
  serviceSid: string;
  to: string;
  channel: 'sms' | 'call' | 'email';
  status: 'pending' | 'approved' | 'canceled';
  valid: boolean;
  dateCreated: Date;
}

interface MockVerificationCheck {
  sid: string;
  serviceSid: string;
  to: string;
  channel: string;
  status: 'pending' | 'approved' | 'canceled';
  valid: boolean;
}

interface MockVideoRoom {
  sid: string;
  uniqueName: string;
  status: 'in-progress' | 'completed' | 'failed';
  type: 'peer-to-peer' | 'group' | 'group-small';
  maxParticipants: number;
  duration: number;
  dateCreated: Date;
  endTime: Date | null;
}

interface MockVideoParticipant {
  sid: string;
  roomSid: string;
  identity: string;
  status: 'connected' | 'disconnected';
  dateCreated: Date;
  duration: number;
}

// Mock data storage
const mockCalls: Map<string, MockCall> = new Map();
const mockMessages: Map<string, MockMessage> = new Map();
const mockVerifications: Map<string, MockVerification> = new Map();
const mockVideoRooms: Map<string, MockVideoRoom> = new Map();
const mockVideoParticipants: Map<string, MockVideoParticipant> = new Map();

// Test phone numbers
export const TEST_PHONE_NUMBERS = {
  SUCCESS: '+15551234567',
  INVALID: '+15550000000',
  UNVERIFIED: '+15559999999',
  BLOCKED: '+15558888888',
};

// Valid verification codes for testing
const VALID_VERIFICATION_CODES = new Map<string, string>();

/**
 * Mock Twilio Client
 */
export const mockTwilio = {
  calls: {
    create: jest.fn(async (params: any) => {
      const call: MockCall = {
        sid: `CA${uuidv4().replace(/-/g, '').substring(0, 32)}`,
        accountSid: 'ACtest',
        from: params.from,
        to: params.to,
        status: 'queued',
        direction: 'outbound-api',
        duration: null,
        startTime: null,
        endTime: null,
        price: null,
        priceUnit: 'USD',
      };

      // Simulate failures for specific numbers
      if (params.to === TEST_PHONE_NUMBERS.INVALID) {
        call.status = 'failed';
        throw createTwilioError('The "To" phone number is not a valid phone number.', 21211);
      }

      mockCalls.set(call.sid, call);
      return call;
    }),

    fetch: jest.fn(async (callSid: string) => {
      const call = mockCalls.get(callSid);
      if (!call) {
        throw createTwilioError(`The requested resource /Calls/${callSid} was not found`, 20404);
      }
      return call;
    }),

    update: jest.fn(async (callSid: string, params: any) => {
      const call = mockCalls.get(callSid);
      if (!call) {
        throw createTwilioError(`The requested resource /Calls/${callSid} was not found`, 20404);
      }

      if (params.status === 'completed') {
        call.status = 'completed';
        call.endTime = new Date();
        call.duration = 60; // Mock 60 seconds
      } else if (params.status === 'canceled') {
        call.status = 'canceled';
      }

      return call;
    }),

    list: jest.fn(async (params: any) => {
      const calls = Array.from(mockCalls.values())
        .filter(call => !params.to || call.to === params.to)
        .filter(call => !params.from || call.from === params.from);
      return calls;
    }),
  },

  messages: {
    create: jest.fn(async (params: any) => {
      const message: MockMessage = {
        sid: `SM${uuidv4().replace(/-/g, '').substring(0, 32)}`,
        accountSid: 'ACtest',
        from: params.from,
        to: params.to,
        body: params.body,
        status: 'queued',
        direction: 'outbound-api',
        numSegments: '1',
        price: null,
        priceUnit: 'USD',
        errorCode: null,
        errorMessage: null,
        dateCreated: new Date(),
        dateSent: null,
      };

      // Simulate failures
      if (params.to === TEST_PHONE_NUMBERS.INVALID) {
        message.status = 'failed';
        message.errorCode = '21211';
        message.errorMessage = 'Invalid phone number';
        throw createTwilioError('The "To" phone number is not a valid phone number.', 21211);
      }

      if (params.to === TEST_PHONE_NUMBERS.BLOCKED) {
        message.status = 'undelivered';
        message.errorCode = '21610';
        message.errorMessage = 'Phone number is blocked';
      }

      mockMessages.set(message.sid, message);

      // Simulate async delivery
      setTimeout(() => {
        const msg = mockMessages.get(message.sid);
        if (msg && msg.status === 'queued') {
          msg.status = 'sent';
          msg.dateSent = new Date();
          setTimeout(() => {
            if (msg.status === 'sent') {
              msg.status = 'delivered';
            }
          }, 100);
        }
      }, 50);

      return message;
    }),

    fetch: jest.fn(async (messageSid: string) => {
      const message = mockMessages.get(messageSid);
      if (!message) {
        throw createTwilioError(`The requested resource /Messages/${messageSid} was not found`, 20404);
      }
      return message;
    }),

    list: jest.fn(async (params: any) => {
      const messages = Array.from(mockMessages.values())
        .filter(msg => !params.to || msg.to === params.to)
        .filter(msg => !params.from || msg.from === params.from);
      return messages;
    }),
  },

  verify: {
    v2: {
      services: jest.fn((serviceSid: string) => ({
        verifications: {
          create: jest.fn(async (params: any) => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const verification: MockVerification = {
              sid: `VE${uuidv4().replace(/-/g, '').substring(0, 32)}`,
              serviceSid,
              to: params.to,
              channel: params.channel,
              status: 'pending',
              valid: false,
              dateCreated: new Date(),
            };

            // Store the code for verification check
            VALID_VERIFICATION_CODES.set(params.to, code);
            mockVerifications.set(verification.sid, verification);

            return verification;
          }),
        },
        verificationChecks: {
          create: jest.fn(async (params: any) => {
            const expectedCode = VALID_VERIFICATION_CODES.get(params.to);
            const isValid = params.code === expectedCode;

            const check: MockVerificationCheck = {
              sid: `VE${uuidv4().replace(/-/g, '').substring(0, 32)}`,
              serviceSid,
              to: params.to,
              channel: 'sms',
              status: isValid ? 'approved' : 'pending',
              valid: isValid,
            };

            if (isValid) {
              VALID_VERIFICATION_CODES.delete(params.to);

              // Update the original verification
              const verifications = Array.from(mockVerifications.values());
              const original = verifications.find(v => v.to === params.to && v.status === 'pending');
              if (original) {
                original.status = 'approved';
                original.valid = true;
              }
            }

            return check;
          }),
        },
      })),
    },
  },

  video: {
    rooms: {
      create: jest.fn(async (params: any) => {
        const room: MockVideoRoom = {
          sid: `RM${uuidv4().replace(/-/g, '').substring(0, 32)}`,
          uniqueName: params.uniqueName || `room_${Date.now()}`,
          status: 'in-progress',
          type: params.type || 'peer-to-peer',
          maxParticipants: params.maxParticipants || 2,
          duration: 0,
          dateCreated: new Date(),
          endTime: null,
        };
        mockVideoRooms.set(room.sid, room);
        return room;
      }),

      fetch: jest.fn(async (roomSid: string) => {
        const room = mockVideoRooms.get(roomSid);
        if (!room) {
          throw createTwilioError(`Room ${roomSid} not found`, 20404);
        }
        return room;
      }),

      update: jest.fn(async (roomSid: string, params: any) => {
        const room = mockVideoRooms.get(roomSid);
        if (!room) {
          throw createTwilioError(`Room ${roomSid} not found`, 20404);
        }

        if (params.status === 'completed') {
          room.status = 'completed';
          room.endTime = new Date();
          room.duration = Math.floor((Date.now() - room.dateCreated.getTime()) / 1000);
        }

        return room;
      }),

      participants: jest.fn((roomSid: string) => ({
        list: jest.fn(async () => {
          const participants = Array.from(mockVideoParticipants.values())
            .filter(p => p.roomSid === roomSid);
          return participants;
        }),
        fetch: jest.fn(async (participantSid: string) => {
          return mockVideoParticipants.get(participantSid);
        }),
      })),
    },

    compositions: {
      create: jest.fn(async (params: any) => {
        return {
          sid: `CJ${uuidv4().replace(/-/g, '').substring(0, 32)}`,
          roomSid: params.roomSid,
          status: 'enqueued',
          dateCreated: new Date(),
        };
      }),
    },
  },

  // Access tokens for video
  jwt: {
    AccessToken: jest.fn().mockImplementation(function(this: any, accountSid: string, apiKey: string, apiSecret: string, options: any) {
      this.identity = options?.identity;
      this.grants = [];

      this.addGrant = jest.fn((grant: any) => {
        this.grants.push(grant);
      });

      this.toJwt = jest.fn(() => {
        return `mock_jwt_token_${this.identity}_${Date.now()}`;
      });
    }),

    VideoGrant: jest.fn().mockImplementation(function(this: any, options: any) {
      this.room = options?.room;
    }),

    ChatGrant: jest.fn().mockImplementation(function(this: any, options: any) {
      this.serviceSid = options?.serviceSid;
    }),
  },
};

// Helper to create Twilio-like errors
function createTwilioError(message: string, code: number) {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).status = code === 20404 ? 404 : 400;
  return error;
}

// Utility functions
export function resetMockTwilio() {
  mockCalls.clear();
  mockMessages.clear();
  mockVerifications.clear();
  mockVideoRooms.clear();
  mockVideoParticipants.clear();
  VALID_VERIFICATION_CODES.clear();

  // Reset all mock implementations
  jest.clearAllMocks();
}

export function simulateCallAnswer(callSid: string) {
  const call = mockCalls.get(callSid);
  if (call) {
    call.status = 'in-progress';
    call.startTime = new Date();
  }
}

export function simulateCallEnd(callSid: string, duration: number = 60) {
  const call = mockCalls.get(callSid);
  if (call) {
    call.status = 'completed';
    call.endTime = new Date();
    call.duration = duration;
    call.price = '-0.0150';
  }
}

export function setVerificationCode(phoneNumber: string, code: string) {
  VALID_VERIFICATION_CODES.set(phoneNumber, code);
}

export function createMockVideoRoom(uniqueName: string): MockVideoRoom {
  const room: MockVideoRoom = {
    sid: `RM${uuidv4().replace(/-/g, '').substring(0, 32)}`,
    uniqueName,
    status: 'in-progress',
    type: 'peer-to-peer',
    maxParticipants: 2,
    duration: 0,
    dateCreated: new Date(),
    endTime: null,
  };
  mockVideoRooms.set(room.sid, room);
  return room;
}

export function addMockParticipant(roomSid: string, identity: string): MockVideoParticipant {
  const participant: MockVideoParticipant = {
    sid: `PA${uuidv4().replace(/-/g, '').substring(0, 32)}`,
    roomSid,
    identity,
    status: 'connected',
    dateCreated: new Date(),
    duration: 0,
  };
  mockVideoParticipants.set(participant.sid, participant);
  return participant;
}

export default mockTwilio;
