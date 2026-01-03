import db from '../../infrastructure/database/connection';
import {
  CoachingSession,
  CoachingSessionCreateInput,
  CoachingSessionUpdateInput,
  Coach,
  CoachCreateInput,
  CoachAssignment,
  CoachingSessionWithCoach,
  CoachWithDetails,
} from '../entities/CoachingSession.entity';

export class CoachingRepository {
  private sessionsTable = 'coaching_sessions';
  private coachesTable = 'coaches';
  private assignmentsTable = 'coach_assignments';

  // ============ Coaching Sessions ============

  async createSession(data: CoachingSessionCreateInput): Promise<CoachingSession> {
    const [session] = await db(this.sessionsTable)
      .insert({
        user_id: data.user_id,
        coach_id: data.coach_id,
        scheduled_at: data.scheduled_at,
        duration: data.duration || 60,
        status: 'scheduled',
        type: data.type || 'follow_up',
        topic: data.topic,
      })
      .returning('*');

    return session;
  }

  async findSessionById(id: string): Promise<CoachingSession | null> {
    const session = await db(this.sessionsTable).where({ id }).first();
    return session || null;
  }

  async findSessionWithCoach(id: string): Promise<CoachingSessionWithCoach | null> {
    const session = await db(this.sessionsTable)
      .select(
        `${this.sessionsTable}.*`,
        `${this.coachesTable}.name as coach_name`,
        `${this.coachesTable}.title as coach_title`,
        `${this.coachesTable}.avatar_url as coach_avatar_url`
      )
      .join(this.coachesTable, `${this.sessionsTable}.coach_id`, `${this.coachesTable}.id`)
      .where(`${this.sessionsTable}.id`, id)
      .first();

    return session || null;
  }

  async updateSession(id: string, data: CoachingSessionUpdateInput): Promise<CoachingSession | null> {
    const [session] = await db(this.sessionsTable)
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return session || null;
  }

  async getUserSessions(userId: string, includeHistorical = false): Promise<CoachingSessionWithCoach[]> {
    let query = db(this.sessionsTable)
      .select(
        `${this.sessionsTable}.*`,
        `${this.coachesTable}.name as coach_name`,
        `${this.coachesTable}.title as coach_title`,
        `${this.coachesTable}.avatar_url as coach_avatar_url`
      )
      .join(this.coachesTable, `${this.sessionsTable}.coach_id`, `${this.coachesTable}.id`)
      .where(`${this.sessionsTable}.user_id`, userId)
      .orderBy(`${this.sessionsTable}.scheduled_at`, 'desc');

    if (!includeHistorical) {
      query = query.where(`${this.sessionsTable}.scheduled_at`, '>=', new Date());
    }

    return query;
  }

  async getUpcomingSession(userId: string): Promise<CoachingSessionWithCoach | null> {
    const session = await db(this.sessionsTable)
      .select(
        `${this.sessionsTable}.*`,
        `${this.coachesTable}.name as coach_name`,
        `${this.coachesTable}.title as coach_title`,
        `${this.coachesTable}.avatar_url as coach_avatar_url`
      )
      .join(this.coachesTable, `${this.sessionsTable}.coach_id`, `${this.coachesTable}.id`)
      .where(`${this.sessionsTable}.user_id`, userId)
      .where(`${this.sessionsTable}.scheduled_at`, '>=', new Date())
      .where(`${this.sessionsTable}.status`, 'scheduled')
      .orderBy(`${this.sessionsTable}.scheduled_at`, 'asc')
      .first();

    return session || null;
  }

  // ============ Coaches ============

  async createCoach(data: CoachCreateInput): Promise<Coach> {
    const [coach] = await db(this.coachesTable)
      .insert({
        user_id: data.user_id,
        name: data.name,
        title: data.title,
        bio: data.bio,
        specialties: data.specialties ? JSON.stringify(data.specialties) : null,
        avatar_url: data.avatar_url,
        availability_hours: data.availability_hours,
        rating: 5.0,
        total_sessions: 0,
        is_active: true,
      })
      .returning('*');

    return this.parseCoach(coach);
  }

  async findCoachById(id: string): Promise<Coach | null> {
    const coach = await db(this.coachesTable).where({ id }).first();
    return coach ? this.parseCoach(coach) : null;
  }

  async findCoachByUserId(userId: string): Promise<Coach | null> {
    const coach = await db(this.coachesTable).where({ user_id: userId }).first();
    return coach ? this.parseCoach(coach) : null;
  }

  async listActiveCoaches(): Promise<CoachWithDetails[]> {
    const coaches = await db(this.coachesTable)
      .where('is_active', true)
      .orderBy('rating', 'desc');

    return coaches.map((c: any) => this.parseCoach(c));
  }

  async updateCoachStats(coachId: string, rating: number): Promise<void> {
    // Get current stats
    const coach = await db(this.coachesTable).where({ id: coachId }).first();
    if (!coach) return;

    // Calculate new average rating
    const totalSessions = coach.total_sessions + 1;
    const newRating = ((coach.rating * coach.total_sessions) + rating) / totalSessions;

    await db(this.coachesTable)
      .where({ id: coachId })
      .update({
        rating: Math.round(newRating * 10) / 10,
        total_sessions: totalSessions,
        updated_at: db.fn.now(),
      });
  }

  // ============ Coach Assignments ============

  async createAssignment(userId: string, coachId: string): Promise<CoachAssignment> {
    // Deactivate any existing assignment
    await db(this.assignmentsTable)
      .where({ user_id: userId, is_active: true })
      .update({ is_active: false, updated_at: db.fn.now() });

    const [assignment] = await db(this.assignmentsTable)
      .insert({
        user_id: userId,
        coach_id: coachId,
        assigned_at: new Date(),
        is_active: true,
      })
      .returning('*');

    return assignment;
  }

  async getActiveAssignment(userId: string): Promise<CoachAssignment | null> {
    const assignment = await db(this.assignmentsTable)
      .where({ user_id: userId, is_active: true })
      .first();

    return assignment || null;
  }

  async getAssignedCoach(userId: string): Promise<CoachWithDetails | null> {
    const result = await db(this.assignmentsTable)
      .select(`${this.coachesTable}.*`)
      .join(this.coachesTable, `${this.assignmentsTable}.coach_id`, `${this.coachesTable}.id`)
      .where(`${this.assignmentsTable}.user_id`, userId)
      .where(`${this.assignmentsTable}.is_active`, true)
      .where(`${this.coachesTable}.is_active`, true)
      .first();

    return result ? this.parseCoach(result) : null;
  }

  async assignCoachToUser(userId: string): Promise<CoachWithDetails | null> {
    // Find a coach with the least assignments (simple load balancing)
    const coach = await db(this.coachesTable)
      .select(`${this.coachesTable}.*`)
      .leftJoin(
        db(this.assignmentsTable)
          .select('coach_id')
          .count('* as assignment_count')
          .where('is_active', true)
          .groupBy('coach_id')
          .as('assignments'),
        `${this.coachesTable}.id`,
        'assignments.coach_id'
      )
      .where(`${this.coachesTable}.is_active`, true)
      .orderByRaw('COALESCE(assignments.assignment_count, 0) ASC')
      .orderBy(`${this.coachesTable}.rating`, 'desc')
      .first();

    if (!coach) return null;

    await this.createAssignment(userId, coach.id);
    return this.parseCoach(coach);
  }

  private parseCoach(coach: any): CoachWithDetails {
    return {
      ...coach,
      specialties: coach.specialties
        ? typeof coach.specialties === 'string'
          ? JSON.parse(coach.specialties)
          : coach.specialties
        : [],
    };
  }
}
