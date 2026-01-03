import { VipEventRepository } from '../repositories/vip-event.repository';
import {
  VipEvent,
  VipEventCreateInput,
  VipEventUpdateInput,
  VipEventListFilters,
  VipEventResponse,
} from '../entities/VipEvent.entity';
import {
  VipEventAttendee,
  VipEventAttendeeWithEvent,
} from '../entities/VipEventAttendee.entity';
import logger from '../../utils/logger';

export class VipEventService {
  private repository: VipEventRepository;

  constructor() {
    this.repository = new VipEventRepository();
  }

  /**
   * List all upcoming VIP events for Elite members
   */
  async listUpcomingEvents(
    userId: string,
    filters?: VipEventListFilters
  ): Promise<VipEventResponse[]> {
    try {
      const events = await this.repository.listUpcomingEvents(filters);

      // Get user's registrations to mark which events they're registered for
      const userEvents = await this.repository.getUserEvents(userId, false);
      const registeredEventIds = new Set(
        userEvents
          .filter((e) => e.status === 'registered')
          .map((e) => e.event_id)
      );

      return events.map((event) => this.toEventResponse(event, registeredEventIds.has(event.id)));
    } catch (error) {
      logger.error('Error listing upcoming VIP events:', error);
      throw error;
    }
  }

  /**
   * Get a single VIP event by ID
   */
  async getEvent(eventId: string, userId: string): Promise<VipEventResponse | null> {
    try {
      const event = await this.repository.findEventById(eventId);
      if (!event) return null;

      const attendee = await this.repository.findAttendee(eventId, userId);
      const isRegistered = attendee?.status === 'registered';

      return this.toEventResponse(event, isRegistered);
    } catch (error) {
      logger.error('Error getting VIP event:', error);
      throw error;
    }
  }

  /**
   * Register a user for a VIP event
   */
  async registerForEvent(
    userId: string,
    eventId: string
  ): Promise<{ success: boolean; attendee?: VipEventAttendee; error?: string }> {
    try {
      // Check if event exists and is active
      const event = await this.repository.findEventById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      if (!event.is_active) {
        return { success: false, error: 'Event is no longer available' };
      }

      // Check if event is in the future
      if (new Date(event.date) < new Date()) {
        return { success: false, error: 'Cannot register for past events' };
      }

      // Check if event has availability
      if (event.current_attendees >= event.max_attendees) {
        return { success: false, error: 'Event is at full capacity' };
      }

      // Check if user is already registered
      const existingAttendee = await this.repository.findAttendee(eventId, userId);
      if (existingAttendee) {
        if (existingAttendee.status === 'registered') {
          return { success: false, error: 'Already registered for this event' };
        }

        // If cancelled, allow re-registration
        if (existingAttendee.status === 'cancelled') {
          const updated = await this.repository.updateAttendee(existingAttendee.id, {
            status: 'registered',
            cancelled_at: undefined,
            cancellation_reason: undefined,
          });
          await this.repository.incrementAttendeeCount(eventId);
          return { success: true, attendee: updated! };
        }
      }

      // Create new registration
      const attendee = await this.repository.createAttendee({
        event_id: eventId,
        user_id: userId,
        status: 'registered',
      });

      await this.repository.incrementAttendeeCount(eventId);

      logger.info(`User ${userId} registered for VIP event ${eventId}`);
      return { success: true, attendee };
    } catch (error) {
      logger.error('Error registering for VIP event:', error);
      throw error;
    }
  }

  /**
   * Cancel a user's event registration
   */
  async cancelRegistration(
    userId: string,
    eventId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const attendee = await this.repository.findAttendee(eventId, userId);
      if (!attendee) {
        return { success: false, error: 'Registration not found' };
      }

      if (attendee.status === 'cancelled') {
        return { success: false, error: 'Registration already cancelled' };
      }

      if (attendee.status === 'attended') {
        return { success: false, error: 'Cannot cancel after attending' };
      }

      // Check if cancellation is allowed (e.g., 24 hours before event)
      const event = await this.repository.findEventById(eventId);
      if (event) {
        const eventDate = new Date(event.date);
        const now = new Date();
        const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilEvent < 24) {
          logger.warn(`Late cancellation for event ${eventId} by user ${userId}`);
          // Still allow cancellation but could add penalty logic here
        }
      }

      await this.repository.updateAttendee(attendee.id, {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason,
      });

      await this.repository.decrementAttendeeCount(eventId);

      logger.info(`User ${userId} cancelled registration for VIP event ${eventId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling VIP event registration:', error);
      throw error;
    }
  }

  /**
   * Get all events a user is registered for
   */
  async getMyEvents(
    userId: string,
    includeHistorical = false
  ): Promise<VipEventAttendeeWithEvent[]> {
    try {
      return this.repository.getUserEvents(userId, includeHistorical);
    } catch (error) {
      logger.error('Error getting user VIP events:', error);
      throw error;
    }
  }

  /**
   * Create a new VIP event (admin only)
   */
  async createEvent(data: VipEventCreateInput): Promise<VipEvent> {
    try {
      const event = await this.repository.createEvent(data);
      logger.info(`VIP event created: ${event.id}`);
      return event;
    } catch (error) {
      logger.error('Error creating VIP event:', error);
      throw error;
    }
  }

  /**
   * Update a VIP event (admin only)
   */
  async updateEvent(eventId: string, data: VipEventUpdateInput): Promise<VipEvent | null> {
    try {
      const event = await this.repository.updateEvent(eventId, data);
      if (event) {
        logger.info(`VIP event updated: ${eventId}`);
      }
      return event;
    } catch (error) {
      logger.error('Error updating VIP event:', error);
      throw error;
    }
  }

  private toEventResponse(event: VipEvent, isRegistered: boolean): VipEventResponse {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      type: event.type,
      location: event.location,
      virtual_link: event.virtual_link,
      date: event.date,
      end_date: event.end_date,
      max_attendees: event.max_attendees,
      current_attendees: event.current_attendees,
      spots_available: event.max_attendees - event.current_attendees,
      tier: event.tier,
      image_url: event.image_url,
      host_name: event.host_name,
      host_title: event.host_title,
      tags: event.tags,
      is_registered: isRegistered,
    };
  }
}
