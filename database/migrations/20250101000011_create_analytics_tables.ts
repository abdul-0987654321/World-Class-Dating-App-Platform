import { Knex } from 'knex';

/**
 * Migration: Create Analytics Tables
 * Description: Event tracking, user attribution, conversion funnel, and campaign analytics
 */
export async function up(knex: Knex): Promise<void> {
  // Create analytics_events table
  await knex.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.string('session_id', 255).nullable();

    // Event information
    table.string('event_type', 100).notNullable(); // 'page_view', 'click', 'conversion', etc.
    table.string('event_name', 100).notNullable(); // Specific event name
    table.string('event_category', 50).nullable(); // Event category for grouping

    // Event properties
    table.jsonb('properties').defaultTo('{}');
    table.string('page_url', 500).nullable();
    table.string('referrer_url', 500).nullable();

    // UTM parameters (for attribution)
    table.string('utm_source', 255).nullable();
    table.string('utm_medium', 255).nullable();
    table.string('utm_campaign', 255).nullable();
    table.string('utm_content', 255).nullable();
    table.string('utm_term', 255).nullable();

    // Click IDs (for platform-specific tracking)
    table.jsonb('click_ids').nullable(); // { fbclid, gclid, ttclid, etc. }

    // Device & Browser Info
    table.text('user_agent').nullable();
    table.string('ip_address', 45).nullable();
    table.string('device_type', 50).nullable(); // mobile, desktop, tablet
    table.string('browser', 100).nullable();
    table.string('os', 100).nullable();

    // Location
    table.string('country', 2).nullable(); // ISO country code
    table.string('region', 100).nullable();
    table.string('city', 100).nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for fast queries
    table.index('user_id');
    table.index('session_id');
    table.index('event_type');
    table.index('event_name');
    table.index('utm_source');
    table.index('utm_campaign');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
    table.index(['event_type', 'created_at']);
  });

  // Create user_attribution table
  await knex.schema.createTable('user_attribution', (table) => {
    table.uuid('user_id').primary()
      .references('id').inTable('users').onDelete('CASCADE');

    // First Touch Attribution (initial source)
    table.string('first_touch_source', 255).nullable();
    table.string('first_touch_medium', 255).nullable();
    table.string('first_touch_campaign', 255).nullable();
    table.string('first_touch_content', 255).nullable();
    table.jsonb('first_touch_click_id').nullable();
    table.timestamp('first_touch_timestamp').nullable();
    table.text('first_touch_landing_page').nullable();
    table.text('first_touch_referrer').nullable();

    // Last Touch Attribution (conversion source)
    table.string('last_touch_source', 255).nullable();
    table.string('last_touch_medium', 255).nullable();
    table.string('last_touch_campaign', 255).nullable();
    table.string('last_touch_content', 255).nullable();
    table.jsonb('last_touch_click_id').nullable();
    table.timestamp('last_touch_timestamp').nullable();

    // Registration Info
    table.timestamp('registration_timestamp').nullable();
    table.string('registration_source', 255).nullable();
    table.string('registration_campaign', 255).nullable();

    // Conversion tracking
    table.timestamp('first_subscription_at').nullable();
    table.string('subscription_source', 255).nullable();

    // Attribution Model
    table.string('attribution_model', 50).defaultTo('last_touch');

    // Metadata
    table.integer('total_touchpoints').defaultTo(1);
    table.jsonb('touchpoint_data').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('first_touch_source');
    table.index('last_touch_source');
    table.index('registration_timestamp');
    table.index('registration_source');
  });

  // Create user_sessions table
  await knex.schema.createTable('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('session_id', 255).unique().notNullable();
    table.uuid('user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    // Session Start
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.text('landing_page').nullable();
    table.text('referrer_url').nullable();

    // UTM Parameters
    table.string('utm_source', 255).nullable();
    table.string('utm_medium', 255).nullable();
    table.string('utm_campaign', 255).nullable();
    table.string('utm_content', 255).nullable();
    table.string('utm_term', 255).nullable();

    // Click IDs
    table.jsonb('click_ids').nullable();

    // Device Info
    table.text('user_agent').nullable();
    table.string('ip_address', 45).nullable();
    table.string('device_type', 50).nullable();
    table.string('browser', 100).nullable();
    table.string('os', 100).nullable();

    // Location
    table.string('country', 2).nullable();
    table.string('region', 100).nullable();
    table.string('city', 100).nullable();

    // Session Activity
    table.integer('page_views').defaultTo(0);
    table.integer('events_count').defaultTo(0);
    table.integer('duration_seconds').nullable();

    // Session End
    table.timestamp('ended_at').nullable();
    table.text('exit_page').nullable();

    // Conversion
    table.boolean('converted').defaultTo(false);
    table.timestamp('conversion_timestamp').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('session_id');
    table.index('user_id');
    table.index('started_at');
    table.index('utm_source');
    table.index('converted');
  });

  // Create conversion_funnel table
  await knex.schema.createTable('conversion_funnel', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('session_id', 255).nullable();

    // Funnel Steps (timestamps)
    table.timestamp('landing_page_view_at').nullable();
    table.timestamp('registration_started_at').nullable();
    table.timestamp('email_entered_at').nullable();
    table.timestamp('password_created_at').nullable();
    table.timestamp('registration_completed_at').nullable();
    table.timestamp('email_verified_at').nullable();
    table.timestamp('profile_started_at').nullable();
    table.timestamp('photo_uploaded_at').nullable();
    table.timestamp('profile_completed_at').nullable();
    table.timestamp('first_swipe_at').nullable();
    table.timestamp('first_match_at').nullable();
    table.timestamp('first_message_at').nullable();
    table.timestamp('subscription_purchased_at').nullable();

    // Time to Complete (in seconds)
    table.integer('time_to_register').nullable();
    table.integer('time_to_verify').nullable();
    table.integer('time_to_profile').nullable();
    table.integer('time_to_match').nullable();
    table.integer('time_to_subscribe').nullable();

    // Drop-off Analysis
    table.string('dropped_at_step', 100).nullable();
    table.boolean('completed').defaultTo(false);

    // Attribution
    table.string('utm_source', 255).nullable();
    table.string('utm_campaign', 255).nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('session_id');
    table.index('utm_source');
    table.index('completed');
    table.index('dropped_at_step');
  });

  // Create ad_campaign_performance table
  await knex.schema.createTable('ad_campaign_performance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Campaign Identifiers
    table.string('platform', 100).notNullable(); // facebook, tiktok, google, snapchat
    table.string('campaign_id', 255).notNullable();
    table.string('campaign_name', 255).nullable();
    table.string('ad_set_id', 255).nullable();
    table.string('ad_set_name', 255).nullable();
    table.string('ad_id', 255).nullable();
    table.string('ad_name', 255).nullable();

    // UTM Parameters
    table.string('utm_source', 255).nullable();
    table.string('utm_medium', 255).nullable();
    table.string('utm_campaign', 255).nullable();
    table.string('utm_content', 255).nullable();

    // Metrics (updated daily)
    table.integer('impressions').defaultTo(0);
    table.integer('clicks').defaultTo(0);
    table.decimal('spend', 10, 2).defaultTo(0);

    // Conversions
    table.integer('registrations').defaultTo(0);
    table.integer('email_verifications').defaultTo(0);
    table.integer('profile_completions').defaultTo(0);
    table.integer('subscriptions').defaultTo(0);

    // Calculated Metrics
    table.decimal('ctr', 10, 6).nullable(); // Click-through rate
    table.decimal('cpc', 10, 2).nullable(); // Cost per click
    table.decimal('cpm', 10, 2).nullable(); // Cost per 1000 impressions
    table.decimal('cpa', 10, 2).nullable(); // Cost per acquisition
    table.decimal('roas', 10, 2).nullable(); // Return on ad spend

    // Revenue
    table.decimal('revenue', 10, 2).defaultTo(0);

    // Date Range
    table.date('date').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Unique constraint
    table.unique(['platform', 'campaign_id', 'ad_id', 'date']);

    // Indexes
    table.index('platform');
    table.index('campaign_id');
    table.index('date');
    table.index('utm_campaign');
    table.index(['platform', 'date']);
  });

  // Create engagement_metrics table (daily user engagement)
  await knex.schema.createTable('engagement_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();

    // Activity metrics
    table.integer('swipes_count').defaultTo(0);
    table.integer('likes_given').defaultTo(0);
    table.integer('passes_given').defaultTo(0);
    table.integer('super_likes_given').defaultTo(0);
    table.integer('likes_received').defaultTo(0);
    table.integer('matches_count').defaultTo(0);
    table.integer('messages_sent').defaultTo(0);
    table.integer('messages_received').defaultTo(0);
    table.integer('profile_views').defaultTo(0);
    table.integer('sessions_count').defaultTo(0);
    table.integer('total_time_minutes').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Unique constraint
    table.unique(['user_id', 'date']);

    // Indexes
    table.index('user_id');
    table.index('date');
    table.index(['user_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('engagement_metrics');
  await knex.schema.dropTableIfExists('ad_campaign_performance');
  await knex.schema.dropTableIfExists('conversion_funnel');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('user_attribution');
  await knex.schema.dropTableIfExists('analytics_events');
}
