import db from '../../infrastructure/database/connection';
import {
  VipEvent,
  VipEventCreateInput,
  VipEventUpdateInput,
  VipEventListFilters,
} from '../entities/VipEvent.entity';
import {
  VipEventAttendee,
  VipEventAttendeeCreateInput,
  VipEventAttendeeUpdateInput,
  VipEventAttendeeWithEvent,
} from '../entities/VipEventAttendee.entity';

export class VipEventRepository {
  private eventsTable = 'vip_events';
  private attendeesTable = 'vip_event_attendees';

  // ============ VIP Events ============

  async createEvent(data: VipEventCreateInput): Promise<VipEvent> {
    const [event] = await db(this.eventsTable)
      .insert({
        name: data.name,
        description: data.description,
        type: data.type,
        location: data.location,
        virtual_link: data.virtual_link,
        date: data.date,
        end_date: data.end_date,
        max_attendees: data.max_attendees,
        current_attendees: 0,
        tier: data.tier || 'elite',
        image_url: data.image_url,
        host_name: data.host_name,
        host_title: data.host_title,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        is_active: true,
      })
      .returning('*');

    return this.parseEvent(event);
  }

  async findEventById(id: string): Promise<VipEvent | null> {
    const event = await db(this.eventsTable).where({ id }).first();
    return event ? this.parseEvent(event) : null;
  }

  async listUpcomingEvents(filters?: VipEventListFilters): Promise<VipEvent[]> {
    let query = db(this.eventsTable)
      .where('is_active', true)
      .where('date', '>=', new Date())
      .orderBy('date', 'asc');

    if (filters?.type) {
      query = query.where('type', filters.type);
    }

    if (filters?.has_availability) {
      query = query.whereRaw('current_attendees < max_attendees');
    }

    const events = await query;
    return events.map((e: any) => this.parseEvent(e));
  }

  async updateEvent(id: string, data: VipEventUpdateInput): Promise<VipEvent | null> {
    const updateData: any = { ...data, updated_at: db.fn.now() };
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }

    const [event] = await db(this.eventsTable).where({ id }).update(updateData).returning('*');

    return event ? this.parseEvent(event) : null;
  }

  async incrementAttendeeCount(eventId: string): Promise<void> {
    await db(this.eventsTable).where({ id: eventId }).increment('current_attendees', 1);
  }

  async decrementAttendeeCount(eventId: string): Promise<void> {
    await db(this.eventsTable)
      .where({ id: eventId })
      .where('current_attendees', '>', 0)
      .decrement('current_attendees', 1);
  }

  // ============ VIP Event Attendees ============

  async createAttendee(data: VipEventAttendeeCreateInput): Promise<VipEventAttendee> {
    const [attendee] = await db(this.attendeesTable)
      .insert({
        event_id: data.event_id,
        user_id: data.user_id,
        status: data.status || 'registered',
        registered_at: new Date(),
      })
      .returning('*');

    return attendee;
  }

  async findAttendee(eventId: string, userId: string): Promise<VipEventAttendee | null> {
    const attendee = await db(this.attendeesTable)
      .where({ event_id: eventId, user_id: userId })
      .first();

    return attendee || null;
  }

  async findAttendeeById(id: string): Promise<VipEventAttendee | null> {
    const attendee = await db(this.attendeesTable).where({ id }).first();
    return attendee || null;
  }

  async updateAttendee(
    id: string,
    data: VipEventAttendeeUpdateInput
  ): Promise<VipEventAttendee | null> {
    const [attendee] = await db(this.attendeesTable)
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return attendee || null;
  }

  async getUserEvents(
    userId: string,
    includeHistorical = false
  ): Promise<VipEventAttendeeWithEvent[]> {
    let query = db(this.attendeesTable)
      .select(
        `${this.attendeesTable}.*`,
        `${this.eventsTable}.name as event_name`,
        `${this.eventsTable}.date as event_date`,
        `${this.eventsTable}.type as event_type`,
        `${this.eventsTable}.location as event_location`,
        `${this.eventsTable}.image_url as event_image_url`
      )
      .join(this.eventsTable, `${this.attendeesTable}.event_id`, `${this.eventsTable}.id`)
      .where(`${this.attendeesTable}.user_id`, userId)
      .orderBy(`${this.eventsTable}.date`, 'desc');

    if (!includeHistorical) {
      query = query.where(`${this.eventsTable}.date`, '>=', new Date());
    }

    const results = await query;
    return results;
  }

  async getEventAttendees(eventId: string): Promise<VipEventAttendee[]> {
    return db(this.attendeesTable).where({ event_id: eventId }).orderBy('registered_at', 'asc');
  }

  async countEventAttendees(eventId: string): Promise<number> {
    const result = await db(this.attendeesTable)
      .where({ event_id: eventId })
      .whereNot('status', 'cancelled')
      .count('id as count')
      .first();

    return parseInt(result?.count as string, 10) || 0;
  }

  private parseEvent(event: any): VipEvent {
    return {
      ...event,
      tags: event.tags
        ? typeof event.tags === 'string'
          ? JSON.parse(event.tags)
          : event.tags
        : [],
    };
  }
}
