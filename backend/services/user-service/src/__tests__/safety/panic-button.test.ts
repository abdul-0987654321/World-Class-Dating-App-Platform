/**
 * Panic Button Service Tests
 * Tests for emergency features including:
 * - Emergency contact notification
 * - Location sharing
 * - Date context capture
 * - Response time requirements
 */

// Mock database connection BEFORE any imports
jest.mock('../../infrastructure/database', () => ({
  db: jest.fn(),
}));

// Mock SOS service
jest.mock('../../domain/services/sos.service', () => ({
  sosService: {
    triggerSOS: jest.fn(),
    cancelSOS: jest.fn(),
    escalateSOS: jest.fn(),
  },
  TriggerSOSResult: {},
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { panicButtonService, PanicEventOptions, PanicLocation } from '../../services/panic-button.service';
import { db } from '../../infrastructure/database';
import { sosService } from '../../domain/services/sos.service';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

describe('PanicButtonService', () => {
  const mockUserId = uuidv4();
  const mockPanicEventId = uuidv4();
  const mockSosAlertId = uuidv4();

  const mockLocation: PanicLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    address: '123 Main St, San Francisco, CA',
    venueName: 'Coffee Shop',
  };

  const mockPanicEvent = {
    id: mockPanicEventId,
    user_id: mockUserId,
    sos_alert_id: mockSosAlertId,
    trigger_type: 'button_press',
    latitude: mockLocation.latitude,
    longitude: mockLocation.longitude,
    location_accuracy: mockLocation.accuracy,
    address: mockLocation.address,
    venue_name: mockLocation.venueName,
    related_match_id: null,
    related_user_id: null,
    emergency_services_contacted: false,
    emergency_services_contacted_at: null,
    emergency_reference_number: null,
    live_location_enabled: false,
    location_history: JSON.stringify([{
      latitude: mockLocation.latitude,
      longitude: mockLocation.longitude,
      timestamp: new Date(),
    }]),
    audio_recording_enabled: false,
    audio_recording_url: null,
    status: 'active',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSosResult = {
    alert: {
      id: mockSosAlertId,
      userId: mockUserId,
      status: 'active',
    },
    notifiedContacts: [
      { id: uuidv4(), name: 'Emergency Contact 1', notified: true },
      { id: uuidv4(), name: 'Emergency Contact 2', notified: true },
    ],
  };

  let mockDbQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock database query builder
    mockDbQuery = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      first: jest.fn(),
      count: jest.fn().mockReturnThis(),
      del: jest.fn(),
      returning: jest.fn().mockResolvedValue([mockPanicEvent]),
    };

    (db as unknown as jest.Mock).mockReturnValue(mockDbQuery);
    (sosService.triggerSOS as jest.Mock).mockResolvedValue(mockSosResult);
    (sosService.cancelSOS as jest.Mock).mockResolvedValue({ success: true });
    (sosService.escalateSOS as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Emergency Contact Notification', () => {
    it('should notify emergency contacts when panic is triggered', async () => {
      const result = await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
      });

      expect(sosService.triggerSOS).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          latitude: mockLocation.latitude,
          longitude: mockLocation.longitude,
          accuracy: mockLocation.accuracy,
        }),
        undefined
      );
      expect(result.sosResult.notifiedContacts).toHaveLength(2);
    });

    it('should notify contacts with reason when provided', async () => {
      const reason = 'Feeling unsafe on date';

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        reason,
      });

      expect(sosService.triggerSOS).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Object),
        reason
      );
    });

    it('should handle panic trigger without location', async () => {
      const result = await panicButtonService.triggerPanic(mockUserId, {});

      expect(sosService.triggerSOS).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        undefined
      );
      expect(result.panicEvent).toBeDefined();
    });

    it('should log panic trigger as warning for audit', async () => {
      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('PANIC BUTTON TRIGGERED'),
        expect.objectContaining({
          triggerType: 'button_press',
          location: mockLocation,
        })
      );
    });
  });

  describe('Location Sharing', () => {
    it('should capture initial location on panic trigger', async () => {
      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
      });

      expect(db).toHaveBeenCalledWith('panic_events');
      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: mockLocation.latitude,
          longitude: mockLocation.longitude,
          location_accuracy: mockLocation.accuracy,
          address: mockLocation.address,
          venue_name: mockLocation.venueName,
        })
      );
    });

    it('should enable live location tracking when requested', async () => {
      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        enableLiveLocation: true,
      });

      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          live_location_enabled: true,
        })
      );
    });

    it('should update location for active panic event', async () => {
      mockDbQuery.first.mockResolvedValue({
        ...mockPanicEvent,
        live_location_enabled: true,
        location_history: JSON.stringify([]),
      });

      const newLocation: PanicLocation = {
        latitude: 37.7850,
        longitude: -122.4100,
        accuracy: 15,
      };

      await panicButtonService.updatePanicLocation(
        mockUserId,
        mockPanicEventId,
        newLocation
      );

      expect(mockDbQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          location_accuracy: newLocation.accuracy,
        })
      );
    });

    it('should maintain location history with max 100 entries', async () => {
      // Create history with 100 entries
      const fullHistory = Array.from({ length: 100 }, (_, i) => ({
        latitude: 37.7749 + i * 0.0001,
        longitude: -122.4194 + i * 0.0001,
        timestamp: new Date(),
      }));

      mockDbQuery.first.mockResolvedValue({
        ...mockPanicEvent,
        location_history: JSON.stringify(fullHistory),
      });

      await panicButtonService.updatePanicLocation(mockUserId, mockPanicEventId, {
        latitude: 37.9,
        longitude: -122.5,
      });

      expect(mockDbQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          location_history: expect.any(String),
        })
      );

      // Verify the history doesn't exceed 100 entries
      const updateCall = mockDbQuery.update.mock.calls[0][0];
      const parsedHistory = JSON.parse(updateCall.location_history);
      expect(parsedHistory.length).toBeLessThanOrEqual(100);
    });

    it('should reject location update for non-existent panic event', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      await expect(
        panicButtonService.updatePanicLocation(mockUserId, mockPanicEventId, mockLocation)
      ).rejects.toThrow('Active panic event not found');
    });

    it('should include venue name in location data', async () => {
      await panicButtonService.triggerPanic(mockUserId, {
        location: {
          ...mockLocation,
          venueName: 'Downtown Bar & Grill',
        },
      });

      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          venue_name: 'Downtown Bar & Grill',
        })
      );
    });
  });

  describe('Date Context Capture', () => {
    it('should capture related match ID', async () => {
      const matchId = uuidv4();

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        relatedMatchId: matchId,
      });

      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          related_match_id: matchId,
        })
      );
    });

    it('should capture related user ID (date partner)', async () => {
      const datePartnerId = uuidv4();

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        relatedUserId: datePartnerId,
      });

      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          related_user_id: datePartnerId,
        })
      );
    });

    it('should capture trigger type for context', async () => {
      const triggerTypes: PanicEventOptions['triggerType'][] = [
        'button_press',
        'gesture',
        'voice_command',
        'auto_detection',
        'shake_device',
      ];

      for (const triggerType of triggerTypes) {
        jest.clearAllMocks();
        mockDbQuery.returning.mockResolvedValue([{ ...mockPanicEvent, trigger_type: triggerType }]);

        await panicButtonService.triggerPanic(mockUserId, {
          triggerType,
        });

        expect(mockDbQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            trigger_type: triggerType,
          })
        );
      }
    });

    it('should enable audio recording when requested for evidence capture', async () => {
      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        enableAudioRecording: true,
      });

      expect(mockDbQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          audio_recording_enabled: true,
        })
      );
    });

    it('should log complete context for safety audit', async () => {
      const matchId = uuidv4();
      const datePartnerId = uuidv4();

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
        relatedMatchId: matchId,
        relatedUserId: datePartnerId,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('PANIC EVENT CREATED'),
        expect.objectContaining({
          userId: mockUserId,
          sosAlertId: mockSosAlertId,
        })
      );
    });
  });

  describe('Response Time Requirements', () => {
    it('should complete panic trigger within acceptable time', async () => {
      const startTime = Date.now();

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be under 1000ms for critical safety feature
      expect(responseTime).toBeLessThan(1000);
    });

    it('should prioritize SOS notification before database write', async () => {
      const callOrder: string[] = [];

      (sosService.triggerSOS as jest.Mock).mockImplementation(async () => {
        callOrder.push('sos');
        return mockSosResult;
      });

      mockDbQuery.insert.mockImplementation(() => {
        callOrder.push('db');
        return mockDbQuery;
      });

      await panicButtonService.triggerPanic(mockUserId, {
        location: mockLocation,
      });

      // SOS should be called before or immediately with DB
      expect(callOrder.indexOf('sos')).toBeLessThanOrEqual(callOrder.indexOf('db'));
    });

    it('should handle emergency services contact request quickly', async () => {
      mockDbQuery.first.mockResolvedValue(mockPanicEvent);

      const mockUser = {
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+1234567890',
        email: 'john@example.com',
      };

      (db as unknown as jest.Mock)
        .mockReturnValueOnce(mockDbQuery) // First call for panic_events
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        }) // Second call for users
        .mockReturnValue(mockDbQuery); // Subsequent calls

      const startTime = Date.now();

      await panicButtonService.requestEmergencyServices(mockUserId, mockPanicEventId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Emergency services request should be very fast
      expect(responseTime).toBeLessThan(500);
    });

    it('should return immediately when already contacted emergency services', async () => {
      const existingReferenceNumber = 'FLM-123-ABC';
      mockDbQuery.first.mockResolvedValue({
        ...mockPanicEvent,
        emergency_services_contacted: true,
        emergency_reference_number: existingReferenceNumber,
      });

      const result = await panicButtonService.requestEmergencyServices(
        mockUserId,
        mockPanicEventId
      );

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBe(existingReferenceNumber);
    });
  });

  describe('Panic Resolution', () => {
    it('should allow user to resolve panic event', async () => {
      mockDbQuery.first.mockResolvedValue(mockPanicEvent);
      mockDbQuery.returning.mockResolvedValue([{
        ...mockPanicEvent,
        status: 'resolved',
        resolved_by: mockUserId,
        resolved_at: new Date(),
      }]);

      const result = await panicButtonService.resolvePanic(mockUserId, mockPanicEventId, {
        resolutionNotes: 'I am safe now',
      });

      expect(result.status).toBe('resolved');
      expect(sosService.cancelSOS).toHaveBeenCalledWith(mockUserId, mockSosAlertId);
    });

    it('should mark as false alarm when specified', async () => {
      mockDbQuery.first.mockResolvedValue(mockPanicEvent);
      mockDbQuery.returning.mockResolvedValue([{
        ...mockPanicEvent,
        status: 'false_alarm',
      }]);

      const result = await panicButtonService.resolvePanic(mockUserId, mockPanicEventId, {
        isFalseAlarm: true,
        resolutionNotes: 'Accidental trigger',
      });

      expect(result.status).toBe('false_alarm');
    });

    it('should not resolve already resolved panic event', async () => {
      mockDbQuery.first.mockResolvedValue({
        ...mockPanicEvent,
        status: 'resolved',
      });

      await expect(
        panicButtonService.resolvePanic(mockUserId, mockPanicEventId)
      ).rejects.toThrow('Panic event is not active');
    });

    it('should escalate panic event when needed', async () => {
      mockDbQuery.first.mockResolvedValue(mockPanicEvent);
      mockDbQuery.returning.mockResolvedValue([{
        ...mockPanicEvent,
        status: 'escalated',
      }]);

      const result = await panicButtonService.escalatePanic(
        mockPanicEventId,
        'User not responding'
      );

      expect(result.status).toBe('escalated');
      expect(sosService.escalateSOS).toHaveBeenCalledWith(
        mockSosAlertId,
        'User not responding',
        true
      );
    });
  });

  describe('Panic History and Statistics', () => {
    it('should retrieve active panic events for user', async () => {
      mockDbQuery.first.mockResolvedValue(undefined);
      mockDbQuery.orderBy.mockReturnValue([mockPanicEvent]);

      const events = await panicButtonService.getActivePanicEvents(mockUserId);

      expect(db).toHaveBeenCalledWith('panic_events');
      expect(mockDbQuery.whereIn).toHaveBeenCalledWith('status', ['active', 'escalated']);
    });

    it('should retrieve panic history with limit', async () => {
      const limit = 25;
      mockDbQuery.limit.mockReturnValue([mockPanicEvent]);

      await panicButtonService.getPanicHistory(mockUserId, { limit });

      expect(mockDbQuery.limit).toHaveBeenCalledWith(limit);
    });

    it('should get panic event by ID', async () => {
      mockDbQuery.first.mockResolvedValue(mockPanicEvent);

      const event = await panicButtonService.getPanicEvent(mockPanicEventId, mockUserId);

      expect(event).toBeDefined();
      expect(event?.id).toBe(mockPanicEventId);
    });

    it('should return null for non-existent panic event', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const event = await panicButtonService.getPanicEvent('non-existent-id', mockUserId);

      expect(event).toBeNull();
    });

    it('should get all active panic events for admin', async () => {
      mockDbQuery.select.mockReturnValue([
        { ...mockPanicEvent, email: 'user@example.com', first_name: 'John' },
      ]);

      await panicButtonService.getAllActivePanicEvents();

      expect(mockDbQuery.whereIn).toHaveBeenCalledWith('status', ['active', 'escalated']);
      expect(mockDbQuery.leftJoin).toHaveBeenCalled();
    });
  });

  describe('Emergency Resources', () => {
    it('should return all emergency resources', () => {
      const resources = panicButtonService.getEmergencyResources();

      expect(resources.length).toBeGreaterThan(0);
      expect(resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Emergency Services (911)',
            phone: '911',
            type: 'emergency',
          }),
        ])
      );
    });

    it('should filter resources by region', () => {
      const usResources = panicButtonService.getEmergencyResources('US');

      expect(usResources.every(r => !r.region || r.region === 'US')).toBe(true);
    });

    it('should include crisis hotlines', () => {
      const resources = panicButtonService.getEmergencyResources();

      const crisisResources = resources.filter(r => r.type === 'crisis');
      expect(crisisResources.length).toBeGreaterThan(0);
    });

    it('should include 24-hour availability flag', () => {
      const resources = panicButtonService.getEmergencyResources();

      const available24h = resources.filter(r => r.available24h);
      expect(available24h.length).toBeGreaterThan(0);
    });
  });

  describe('Panic Statistics', () => {
    beforeEach(() => {
      mockDbQuery.count.mockResolvedValue([{ count: '10' }]);
      (db as unknown as jest.Mock).mockReturnValue(mockDbQuery);
    });

    it('should get total panic events count', async () => {
      mockDbQuery.count.mockReturnValue(mockDbQuery);
      mockDbQuery.count.mockResolvedValue([{ count: '100' }]);
      mockDbQuery.select.mockResolvedValue([]);

      const stats = await panicButtonService.getPanicStatistics();

      expect(stats.totalEvents).toBe(100);
    });

    it('should get active events count', async () => {
      mockDbQuery.count.mockReturnValue(mockDbQuery);
      mockDbQuery.count.mockResolvedValue([{ count: '5' }]);
      mockDbQuery.select.mockResolvedValue([]);

      const stats = await panicButtonService.getPanicStatistics();

      expect(typeof stats.activeEvents).toBe('number');
    });

    it('should calculate average resolution time', async () => {
      mockDbQuery.count.mockReturnValue(mockDbQuery);
      mockDbQuery.count.mockResolvedValue([{ count: '10' }]);

      const now = new Date();
      const resolvedEvents = [
        {
          created_at: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins ago
          resolved_at: now,
        },
        {
          created_at: new Date(now.getTime() - 60 * 60 * 1000), // 60 mins ago
          resolved_at: now,
        },
      ];
      mockDbQuery.select.mockResolvedValue(resolvedEvents);

      const stats = await panicButtonService.getPanicStatistics();

      expect(stats.averageResolutionTimeMinutes).toBeGreaterThan(0);
    });

    it('should track emergency services contacted count', async () => {
      mockDbQuery.count.mockReturnValue(mockDbQuery);
      mockDbQuery.count.mockResolvedValue([{ count: '3' }]);
      mockDbQuery.select.mockResolvedValue([]);

      const stats = await panicButtonService.getPanicStatistics();

      expect(typeof stats.emergencyServicesContacted).toBe('number');
    });

    it('should track false alarm count', async () => {
      mockDbQuery.count.mockReturnValue(mockDbQuery);
      mockDbQuery.count.mockResolvedValue([{ count: '2' }]);
      mockDbQuery.select.mockResolvedValue([]);

      const stats = await panicButtonService.getPanicStatistics();

      expect(typeof stats.falseAlarms).toBe('number');
    });
  });
});
