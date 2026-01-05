import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ============ VIP Events Table ============
  await knex.schema.createTable('vip_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description').notNullable();
    table.enum('type', ['virtual', 'in-person']).notNullable();
    table.string('location', 500).nullable();
    table.string('virtual_link', 500).nullable();
    table.timestamp('date').notNullable();
    table.timestamp('end_date').nullable();
    table.integer('max_attendees').notNullable().defaultTo(50);
    table.integer('current_attendees').notNullable().defaultTo(0);
    table.enum('tier', ['elite']).notNullable().defaultTo('elite');
    table.string('image_url', 500).nullable();
    table.string('host_name', 255).nullable();
    table.string('host_title', 255).nullable();
    table.jsonb('tags').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('date');
    table.index('type');
    table.index('is_active');
    table.index(['is_active', 'date']);
  });

  // ============ VIP Event Attendees Table ============
  await knex.schema.createTable('vip_event_attendees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('vip_events').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .enum('status', ['registered', 'attended', 'cancelled', 'no_show'])
      .notNullable()
      .defaultTo('registered');
    table.timestamp('registered_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('attended_at').nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('event_id');
    table.index('user_id');
    table.index('status');
    table.unique(['event_id', 'user_id']);
  });

  // ============ Coaches Table ============
  await knex.schema.createTable('coaches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('name', 255).notNullable();
    table.string('title', 255).notNullable();
    table.text('bio').notNullable();
    table.jsonb('specialties').nullable();
    table.string('avatar_url', 500).nullable();
    table.string('availability_hours', 255).nullable();
    table.decimal('rating', 3, 2).notNullable().defaultTo(5.0);
    table.integer('total_sessions').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('is_active');
    table.index('rating');
  });

  // ============ Coach Assignments Table ============
  await knex.schema.createTable('coach_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('coach_id').notNullable().references('id').inTable('coaches').onDelete('CASCADE');
    table.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('coach_id');
    table.index(['user_id', 'is_active']);
  });

  // ============ Coaching Sessions Table ============
  await knex.schema.createTable('coaching_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('coach_id').notNullable().references('id').inTable('coaches').onDelete('CASCADE');
    table.timestamp('scheduled_at').notNullable();
    table.integer('duration').notNullable().defaultTo(60); // in minutes
    table
      .enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'])
      .notNullable()
      .defaultTo('scheduled');
    table
      .enum('type', [
        'initial_consultation',
        'follow_up',
        'profile_review',
        'date_prep',
        'post_date_debrief',
      ])
      .notNullable()
      .defaultTo('follow_up');
    table.string('topic', 500).nullable();
    table.text('notes').nullable();
    table.text('coach_notes').nullable();
    table.string('meeting_link', 500).nullable();
    table.integer('rating').nullable();
    table.text('feedback').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('coach_id');
    table.index('scheduled_at');
    table.index('status');
    table.index(['user_id', 'status']);
    table.index(['user_id', 'scheduled_at']);
  });

  // ============ Concierge Requests Table ============
  await knex.schema.createTable('concierge_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .enum('type', [
        'date-planning',
        'reservation',
        'advice',
        'gift-recommendation',
        'travel',
        'other',
      ])
      .notNullable();
    table.text('description').notNullable();
    table
      .enum('status', ['pending', 'in_progress', 'awaiting_info', 'completed', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).notNullable().defaultTo('normal');
    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('response').nullable();
    table.text('additional_notes').nullable();
    table.string('budget_range', 100).nullable();
    table.timestamp('preferred_date').nullable();
    table.string('location_preference', 500).nullable();
    table.jsonb('attachments').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('priority');
    table.index('assigned_to');
    table.index(['user_id', 'status']);
    table.index(['status', 'priority']);
  });

  // ============ Concierge Messages Table ============
  await knex.schema.createTable('concierge_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('request_id')
      .notNullable()
      .references('id')
      .inTable('concierge_requests')
      .onDelete('CASCADE');
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('sender_type', ['user', 'concierge']).notNullable();
    table.text('message').notNullable();
    table.jsonb('attachments').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('request_id');
    table.index('sender_id');
    table.index(['request_id', 'created_at']);
  });

  // ============ Seed Sample Coaches ============
  await knex('coaches').insert([
    {
      name: 'Dr. Sarah Mitchell',
      title: 'Senior Dating Coach & Relationship Expert',
      bio: 'With over 15 years of experience in relationship psychology, Dr. Mitchell specializes in helping professionals find meaningful connections. Her approach combines evidence-based strategies with personalized coaching.',
      specialties: JSON.stringify([
        'Executive Dating',
        'First Date Confidence',
        'Long-term Relationship Building',
      ]),
      availability_hours: 'Mon-Fri 9AM-6PM EST',
      rating: 4.9,
      total_sessions: 1250,
      is_active: true,
    },
    {
      name: 'James Anderson',
      title: 'Dating Strategist & Communication Coach',
      bio: 'James brings a unique blend of business strategy and interpersonal skills to dating. Former executive turned dating coach, he helps ambitious individuals navigate the modern dating landscape.',
      specialties: JSON.stringify(['Profile Optimization', 'Conversation Skills', 'Date Planning']),
      availability_hours: 'Tue-Sat 10AM-7PM EST',
      rating: 4.8,
      total_sessions: 890,
      is_active: true,
    },
    {
      name: 'Maria Rodriguez',
      title: 'Holistic Dating Coach',
      bio: 'Maria takes a holistic approach to dating, focusing on self-development, confidence building, and authentic connection. She believes that the best relationships start with self-awareness.',
      specialties: JSON.stringify(['Self-Confidence', 'Mindful Dating', 'Post-Breakup Recovery']),
      availability_hours: 'Mon-Thu 11AM-8PM EST',
      rating: 4.95,
      total_sessions: 720,
      is_active: true,
    },
  ]);

  // ============ Seed Sample VIP Events ============
  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 14);

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 30);

  const futureDate3 = new Date();
  futureDate3.setDate(futureDate3.getDate() + 45);

  await knex('vip_events').insert([
    {
      name: 'Elite Mixer: NYC Rooftop Sunset',
      description:
        'Join fellow Elite members for an exclusive rooftop gathering overlooking the Manhattan skyline. Enjoy premium cocktails, gourmet appetizers, and meaningful conversations in an intimate setting.',
      type: 'in-person',
      location: 'The Skylark, 200 W 39th St, New York, NY',
      date: futureDate1,
      max_attendees: 40,
      current_attendees: 12,
      tier: 'elite',
      host_name: 'Dr. Sarah Mitchell',
      host_title: 'Senior Dating Coach',
      tags: JSON.stringify(['Networking', 'Cocktails', 'NYC', 'Sunset']),
      is_active: true,
    },
    {
      name: 'Virtual Wine & Connect',
      description:
        'A curated virtual wine tasting experience paired with guided conversation starters. Premium wine delivered to your door, expert sommelier guidance, and facilitated introductions with compatible Elite members.',
      type: 'virtual',
      virtual_link: 'https://zoom.us/j/elite-wine-connect',
      date: futureDate2,
      max_attendees: 30,
      current_attendees: 8,
      tier: 'elite',
      host_name: 'James Anderson',
      host_title: 'Dating Strategist',
      tags: JSON.stringify(['Wine Tasting', 'Virtual', 'Icebreakers']),
      is_active: true,
    },
    {
      name: 'Elite Members Yacht Day',
      description:
        'Set sail on a private yacht in Miami for a day of luxury, connection, and adventure. Includes gourmet lunch, water activities, and curated matchmaking introductions.',
      type: 'in-person',
      location: 'Miami Beach Marina, Miami, FL',
      date: futureDate3,
      max_attendees: 24,
      current_attendees: 6,
      tier: 'elite',
      host_name: 'Maria Rodriguez',
      host_title: 'Holistic Dating Coach',
      tags: JSON.stringify(['Yacht', 'Miami', 'Luxury', 'Adventure']),
      is_active: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('concierge_messages');
  await knex.schema.dropTableIfExists('concierge_requests');
  await knex.schema.dropTableIfExists('coaching_sessions');
  await knex.schema.dropTableIfExists('coach_assignments');
  await knex.schema.dropTableIfExists('coaches');
  await knex.schema.dropTableIfExists('vip_event_attendees');
  await knex.schema.dropTableIfExists('vip_events');
}
