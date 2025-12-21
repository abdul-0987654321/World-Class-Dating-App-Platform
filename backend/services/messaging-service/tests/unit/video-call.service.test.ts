import { VideoCallService, CallSession, AgoraConfig } from '../../src/services/video-call.service';

/**
 * Unit Tests for Video Call Service
 */

describe('VideoCallService', () => {
  let videoCallService: VideoCallService;
  let mockRedis: any;
  let mockAgoraConfig: AgoraConfig;

  beforeEach(() => {
    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    mockAgoraConfig = {
      appId: 'test_app_id',
      appCertificate: 'test_certificate',
      tokenExpiryTime: 3600,
    };

    videoCallService = new VideoCallService(mockRedis, mockAgoraConfig);
  });

  describe('initiateCall', () => {
    it('should create a new call session', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await videoCallService.initiateCall(
        'caller-123',
        'John',
        'callee-456',
        'Jane',
        'video',
        'https://avatar.url'
      );

      expect(result.callId).toBeDefined();
      expect(result.channelName).toContain('flamoral_call_');
      expect(result.callerId).toBe('caller-123');
      expect(result.callerName).toBe('John');
      expect(result.calleeId).toBe('callee-456');
      expect(result.calleeName).toBe('Jane');
      expect(result.callType).toBe('video');
      expect(result.status).toBe('initiated');
      expect(result.recordingEnabled).toBe(false);
    });

    it('should store call session in Redis', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.initiateCall(
        'caller-123',
        'John',
        'callee-456',
        'Jane',
        'audio'
      );

      expect(mockRedis.set).toHaveBeenCalled();
      const [key, value, ttl] = mockRedis.set.mock.calls[0];
      expect(key).toContain('call:session:');
      expect(ttl).toBe(60); // 60 seconds timeout
    });

    it('should support audio call type', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await videoCallService.initiateCall(
        'caller-123',
        'John',
        'callee-456',
        'Jane',
        'audio'
      );

      expect(result.callType).toBe('audio');
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        videoCallService.initiateCall('caller-123', 'John', 'callee-456', 'Jane', 'video')
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('generateAgoraToken', () => {
    it('should generate valid token for publisher', () => {
      const token = videoCallService.generateAgoraToken('test_channel', 12345, 'publisher');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate valid token for subscriber', () => {
      const token = videoCallService.generateAgoraToken('test_channel', 12345, 'subscriber');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate different tokens for different channels', () => {
      const token1 = videoCallService.generateAgoraToken('channel_1', 12345, 'publisher');
      const token2 = videoCallService.generateAgoraToken('channel_2', 12345, 'publisher');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different uids', () => {
      const token1 = videoCallService.generateAgoraToken('test_channel', 12345, 'publisher');
      const token2 = videoCallService.generateAgoraToken('test_channel', 67890, 'publisher');

      expect(token1).not.toBe(token2);
    });
  });

  describe('acceptCall', () => {
    const mockCallSession: CallSession = {
      callId: 'call-123',
      channelName: 'flamoral_call_123',
      callerId: 'caller-123',
      callerName: 'John',
      calleeId: 'callee-456',
      calleeName: 'Jane',
      callType: 'video',
      status: 'initiated',
      startTime: Date.now(),
      recordingEnabled: false,
    };

    it('should accept call and return token', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      const result = await videoCallService.acceptCall('call-123', 'callee-456');

      expect(result.callSession.status).toBe('connected');
      expect(result.agoraToken).toBeDefined();
    });

    it('should throw error for non-existent call', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        videoCallService.acceptCall('non-existent', 'callee-456')
      ).rejects.toThrow('Call session not found');
    });

    it('should throw error for unauthorized callee', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));

      await expect(
        videoCallService.acceptCall('call-123', 'wrong-callee')
      ).rejects.toThrow('Unauthorized to accept this call');
    });

    it('should throw error for already connected call', async () => {
      const connectedSession = { ...mockCallSession, status: 'connected' };
      mockRedis.get.mockResolvedValue(JSON.stringify(connectedSession));

      await expect(
        videoCallService.acceptCall('call-123', 'callee-456')
      ).rejects.toThrow('Call cannot be accepted in current status');
    });

    it('should extend Redis TTL on accept', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.acceptCall('call-123', 'callee-456');

      expect(mockRedis.set).toHaveBeenCalled();
      const [, , ttl] = mockRedis.set.mock.calls[0];
      expect(ttl).toBe(7200); // 2 hours
    });
  });

  describe('rejectCall', () => {
    const mockCallSession: CallSession = {
      callId: 'call-123',
      channelName: 'flamoral_call_123',
      callerId: 'caller-123',
      callerName: 'John',
      calleeId: 'callee-456',
      calleeName: 'Jane',
      callType: 'video',
      status: 'initiated',
      startTime: Date.now(),
      recordingEnabled: false,
    };

    it('should reject call', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.rejectCall('call-123', 'callee-456', 'busy');

      expect(mockRedis.set).toHaveBeenCalled();
      const [, value] = mockRedis.set.mock.calls[0];
      const updatedSession = JSON.parse(value);
      expect(updatedSession.status).toBe('rejected');
      expect(updatedSession.duration).toBe(0);
    });

    it('should throw error for unauthorized rejection', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));

      await expect(
        videoCallService.rejectCall('call-123', 'wrong-user', 'busy')
      ).rejects.toThrow('Unauthorized to reject this call');
    });

    it('should set short TTL on rejection', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.rejectCall('call-123', 'callee-456');

      const [, , ttl] = mockRedis.set.mock.calls[0];
      expect(ttl).toBe(300); // 5 minutes
    });
  });

  describe('endCall', () => {
    const mockConnectedCall: CallSession = {
      callId: 'call-123',
      channelName: 'flamoral_call_123',
      callerId: 'caller-123',
      callerName: 'John',
      calleeId: 'callee-456',
      calleeName: 'Jane',
      callType: 'video',
      status: 'connected',
      startTime: Date.now() - 60000, // Started 1 minute ago
      recordingEnabled: false,
    };

    it('should end call by caller', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConnectedCall));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.endCall('call-123', 'caller-123');

      expect(mockRedis.set).toHaveBeenCalled();
      const [, value] = mockRedis.set.mock.calls[0];
      const endedSession = JSON.parse(value);
      expect(endedSession.status).toBe('ended');
      expect(endedSession.duration).toBeGreaterThan(0);
    });

    it('should end call by callee', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConnectedCall));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.endCall('call-123', 'callee-456');

      const [, value] = mockRedis.set.mock.calls[0];
      const endedSession = JSON.parse(value);
      expect(endedSession.status).toBe('ended');
    });

    it('should accept custom duration', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConnectedCall));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.endCall('call-123', 'caller-123', 120);

      const [, value] = mockRedis.set.mock.calls[0];
      const endedSession = JSON.parse(value);
      expect(endedSession.duration).toBe(120);
    });

    it('should throw error for unauthorized end', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConnectedCall));

      await expect(
        videoCallService.endCall('call-123', 'random-user')
      ).rejects.toThrow('Unauthorized to end this call');
    });

    it('should keep call for 24 hours after end', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockConnectedCall));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.endCall('call-123', 'caller-123');

      const [, , ttl] = mockRedis.set.mock.calls[0];
      expect(ttl).toBe(86400); // 24 hours
    });
  });

  describe('markCallAsMissed', () => {
    const mockCallSession: CallSession = {
      callId: 'call-123',
      channelName: 'flamoral_call_123',
      callerId: 'caller-123',
      callerName: 'John',
      calleeId: 'callee-456',
      calleeName: 'Jane',
      callType: 'video',
      status: 'initiated',
      startTime: Date.now(),
      recordingEnabled: false,
    };

    it('should mark call as missed', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.markCallAsMissed('call-123');

      const [, value] = mockRedis.set.mock.calls[0];
      const missedSession = JSON.parse(value);
      expect(missedSession.status).toBe('missed');
      expect(missedSession.duration).toBe(0);
    });

    it('should not throw for non-existent call', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        videoCallService.markCallAsMissed('non-existent')
      ).resolves.toBeUndefined();
    });
  });

  describe('setRecordingConsent', () => {
    const mockCallSession: CallSession = {
      callId: 'call-123',
      channelName: 'flamoral_call_123',
      callerId: 'caller-123',
      callerName: 'John',
      calleeId: 'callee-456',
      calleeName: 'Jane',
      callType: 'video',
      status: 'connected',
      startTime: Date.now(),
      recordingEnabled: false,
    };

    it('should set caller consent', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCallSession));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.setRecordingConsent('call-123', 'caller-123', true);

      const [, value] = mockRedis.set.mock.calls[0];
      const session = JSON.parse(value);
      expect(session.recordingConsent.callerId).toBe(true);
      expect(session.recordingEnabled).toBe(false); // Need both consents
    });

    it('should enable recording when both consent', async () => {
      const sessionWithCallerConsent = {
        ...mockCallSession,
        recordingConsent: { callerId: true, calleeId: false },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionWithCallerConsent));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.setRecordingConsent('call-123', 'callee-456', true);

      const [, value] = mockRedis.set.mock.calls[0];
      const session = JSON.parse(value);
      expect(session.recordingEnabled).toBe(true);
    });

    it('should disable recording when consent is revoked', async () => {
      const sessionWithBothConsent = {
        ...mockCallSession,
        recordingConsent: { callerId: true, calleeId: true },
        recordingEnabled: true,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionWithBothConsent));
      mockRedis.set.mockResolvedValue('OK');

      await videoCallService.setRecordingConsent('call-123', 'caller-123', false);

      const [, value] = mockRedis.set.mock.calls[0];
      const session = JSON.parse(value);
      expect(session.recordingEnabled).toBe(false);
    });
  });

  describe('getCallSession', () => {
    it('should return call session', async () => {
      const mockSession: CallSession = {
        callId: 'call-123',
        channelName: 'flamoral_call_123',
        callerId: 'caller-123',
        callerName: 'John',
        calleeId: 'callee-456',
        calleeName: 'Jane',
        callType: 'video',
        status: 'connected',
        startTime: Date.now(),
        recordingEnabled: false,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await videoCallService.getCallSession('call-123');

      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await videoCallService.getCallSession('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await videoCallService.getCallSession('call-123');

      expect(result).toBeNull();
    });
  });

  describe('isUserInCall', () => {
    it('should return true if user is in active call', async () => {
      const activeCall: CallSession = {
        callId: 'call-123',
        channelName: 'flamoral_call_123',
        callerId: 'user-123',
        callerName: 'John',
        calleeId: 'callee-456',
        calleeName: 'Jane',
        callType: 'video',
        status: 'connected',
        startTime: Date.now(),
        recordingEnabled: false,
      };

      mockRedis.keys.mockResolvedValue(['call:session:call-123']);
      mockRedis.get.mockResolvedValue(JSON.stringify(activeCall));

      const result = await videoCallService.isUserInCall('user-123');

      expect(result).toBe(true);
    });

    it('should return false if user has no active calls', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await videoCallService.isUserInCall('user-123');

      expect(result).toBe(false);
    });

    it('should return false for ended calls', async () => {
      const endedCall: CallSession = {
        callId: 'call-123',
        channelName: 'flamoral_call_123',
        callerId: 'user-123',
        callerName: 'John',
        calleeId: 'callee-456',
        calleeName: 'Jane',
        callType: 'video',
        status: 'ended',
        startTime: Date.now(),
        recordingEnabled: false,
      };

      mockRedis.keys.mockResolvedValue(['call:session:call-123']);
      mockRedis.get.mockResolvedValue(JSON.stringify(endedCall));

      const result = await videoCallService.isUserInCall('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getCallHistory', () => {
    it('should return call history for user', async () => {
      const calls: CallSession[] = [
        {
          callId: 'call-1',
          channelName: 'channel-1',
          callerId: 'user-123',
          callerName: 'John',
          calleeId: 'callee-1',
          calleeName: 'Jane',
          callType: 'video',
          status: 'ended',
          startTime: Date.now() - 3600000,
          recordingEnabled: false,
        },
        {
          callId: 'call-2',
          channelName: 'channel-2',
          callerId: 'caller-2',
          callerName: 'Bob',
          calleeId: 'user-123',
          calleeName: 'John',
          callType: 'audio',
          status: 'ended',
          startTime: Date.now() - 1800000,
          recordingEnabled: false,
        },
      ];

      mockRedis.keys.mockResolvedValue(['call:session:call-1', 'call:session:call-2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(calls[0]))
        .mockResolvedValueOnce(JSON.stringify(calls[1]));

      const result = await videoCallService.getCallHistory('user-123');

      expect(result).toHaveLength(2);
      // Should be sorted by startTime (newest first)
      expect(result[0].callId).toBe('call-2');
    });

    it('should respect limit parameter', async () => {
      const calls: CallSession[] = Array(60).fill(null).map((_, i) => ({
        callId: `call-${i}`,
        channelName: `channel-${i}`,
        callerId: 'user-123',
        callerName: 'John',
        calleeId: `callee-${i}`,
        calleeName: `Callee ${i}`,
        callType: 'video' as const,
        status: 'ended' as const,
        startTime: Date.now() - i * 1000,
        recordingEnabled: false,
      }));

      mockRedis.keys.mockResolvedValue(calls.map(c => `call:session:${c.callId}`));
      calls.forEach(call => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(call));
      });

      const result = await videoCallService.getCallHistory('user-123', 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array on error', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await videoCallService.getCallHistory('user-123');

      expect(result).toEqual([]);
    });
  });
});
