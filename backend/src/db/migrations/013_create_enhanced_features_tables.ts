import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User Wallets for enhanced currency system
  await knex.schema.createTable('user_wallets', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    table.integer('coins').defaultTo(0);
    table.integer('gems').defaultTo(0);
    table.integer('total_coins_earned').defaultTo(0);
    table.integer('total_coins_spent').defaultTo(0);
    table.integer('total_gems_earned').defaultTo(0);
    table.integer('total_gems_spent').defaultTo(0);
    table.integer('current_streak').defaultTo(0);
    table.timestamp('last_daily_reward_claim');
    table.timestamps(true, true);

    table.index('user_id');
  });

  // Wallet transactions
  await knex.schema.createTable('wallet_transactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', [
      'purchase', 'earned', 'daily_reward', 'streak_bonus', 'quest_reward',
      'achievement', 'referral', 'spin_wheel', 'spent', 'refund',
      'gift_sent', 'gift_received', 'expired', 'admin_adjust'
    ]).notNullable();
    table.enum('currency_type', ['coins', 'gems']).notNullable();
    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();
    table.string('description');
    table.uuid('reference_id');
    table.string('reference_type');
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('type');
    table.index('created_at');
  });

  // User active items/buffs
  await knex.schema.createTable('user_active_items', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('item_id').notNullable();
    table.string('item_type').notNullable();
    table.timestamp('activated_at').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index(['user_id', 'item_id']);
    table.index('expires_at');
  });

  // Phone verifications
  await knex.schema.createTable('phone_verifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('phone_number').notNullable();
    table.string('country_code').notNullable();
    table.string('verification_code').notNullable();
    table.enum('status', ['pending', 'verified', 'expired', 'failed']).defaultTo('pending');
    table.integer('attempts').defaultTo(0);
    table.enum('method', ['sms', 'whatsapp', 'voice']).defaultTo('sms');
    table.timestamp('expires_at').notNullable();
    table.timestamp('verified_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index(['phone_number', 'status']);
  });

  // Video calls
  await knex.schema.createTable('video_calls', (table) => {
    table.uuid('id').primary();
    table.string('channel_name').notNullable();
    table.uuid('caller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('callee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', [
      'initiating', 'ringing', 'connecting', 'active',
      'ended', 'missed', 'declined', 'failed', 'busy'
    ]).defaultTo('initiating');
    table.enum('type', ['video', 'audio']).defaultTo('video');
    table.timestamp('started_at');
    table.timestamp('ended_at');
    table.integer('duration'); // seconds
    table.text('caller_token');
    table.text('callee_token');
    table.string('recording_url');
    table.jsonb('quality');
    table.timestamps(true, true);

    table.index('caller_id');
    table.index('callee_id');
    table.index('status');
    table.index('created_at');
  });

  // Video profiles
  await knex.schema.createTable('video_profiles', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('video_url').notNullable();
    table.string('thumbnail_url');
    table.integer('duration').notNullable();
    table.enum('status', ['processing', 'approved', 'rejected', 'pending_review']).defaultTo('processing');
    table.string('prompt_id');
    table.jsonb('moderation_result');
    table.integer('view_count').defaultTo(0);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
  });

  // Video views tracking
  await knex.schema.createTable('video_views', (table) => {
    table.uuid('id').primary();
    table.uuid('video_id').notNullable().references('id').inTable('video_profiles').onDelete('CASCADE');
    table.uuid('viewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('video_id');
    table.index('viewer_id');
  });

  // Voice notes
  await knex.schema.createTable('voice_notes', (table) => {
    table.uuid('id').primary();
    table.uuid('conversation_id').notNullable();
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('audio_url').notNullable();
    table.integer('duration').notNullable();
    table.text('waveform_data');
    table.text('transcription');
    table.enum('status', ['processing', 'approved', 'rejected', 'pending_review']).defaultTo('approved');
    table.boolean('is_played').defaultTo(false);
    table.timestamp('played_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('conversation_id');
    table.index('sender_id');
  });

  // Photo verifications
  await knex.schema.createTable('photo_verifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('selfie_url').notNullable();
    table.string('reference_photo_url').notNullable();
    table.enum('status', ['pending', 'verified', 'rejected', 'expired']).defaultTo('pending');
    table.float('similarity_score').defaultTo(0);
    table.float('ai_confidence').defaultTo(0);
    table.boolean('manual_review_required').defaultTo(false);
    table.uuid('reviewed_by');
    table.timestamp('reviewed_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
  });

  // Travel mode
  await knex.schema.createTable('user_travel_mode', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    table.boolean('is_enabled').defaultTo(false);
    table.float('destination_lat');
    table.float('destination_lng');
    table.string('destination_name');
    table.timestamp('arrival_date');
    table.timestamp('departure_date');
    table.boolean('show_me_in_destination').defaultTo(true);
    table.boolean('match_with_locals').defaultTo(true);
    table.boolean('match_with_travelers').defaultTo(true);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('is_enabled');
  });

  // Daily picks
  await knex.schema.createTable('daily_picks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('picked_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('pick_type', ['top_pick', 'new_match', 'mutual_interest', 'common_interest', 'compatibility']).notNullable();
    table.integer('score');
    table.string('reason');
    table.timestamp('expires_at');
    table.boolean('was_viewed').defaultTo(false);
    table.boolean('was_acted_on').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('created_at');
  });

  // ML interactions for learning
  await knex.schema.createTable('ml_interactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('target_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('interaction_type', ['like', 'superlike', 'pass', 'message', 'unmatch']).notNullable();
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('target_user_id');
    table.index('interaction_type');
    table.index('created_at');
  });

  // Ad placements
  await knex.schema.createTable('ad_placements', (table) => {
    table.uuid('id').primary();
    table.string('placement_type').notNullable();
    table.string('ad_unit_id').notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(0);
    table.jsonb('targeting_rules');
    table.timestamps(true, true);

    table.index(['platform', 'placement_type']);
    table.index('is_active');
  });

  // Ad impressions
  await knex.schema.createTable('ad_impressions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('placement_id');
    table.string('placement_type');
    table.string('ad_type');
    table.timestamp('impression_time').notNullable();
    table.boolean('clicked').defaultTo(false);
    table.timestamp('click_time');
    table.float('revenue');
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('placement_type');
    table.index('impression_time');
  });

  // Ad rewards
  await knex.schema.createTable('ad_rewards', (table) => {
    table.uuid('id').primary();
    table.uuid('impression_id').notNullable().references('id').inTable('ad_impressions').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reward_type').notNullable();
    table.integer('reward_amount').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
  });

  // Affiliate partners
  await knex.schema.createTable('affiliate_partners', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('category').notNullable();
    table.float('commission_rate').notNullable();
    table.string('tracking_url').notNullable();
    table.string('logo_url');
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index('category');
    table.index('is_active');
  });

  // Affiliate clicks
  await knex.schema.createTable('affiliate_clicks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('partner_id').notNullable().references('id').inTable('affiliate_partners').onDelete('CASCADE');
    table.string('tracking_code').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('tracking_code');
  });

  // Affiliate purchases
  await knex.schema.createTable('affiliate_purchases', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('partner_id').notNullable().references('id').inTable('affiliate_partners').onDelete('CASCADE');
    table.float('purchase_amount').notNullable();
    table.float('commission_amount').notNullable();
    table.float('user_reward').notNullable();
    table.enum('status', ['pending', 'confirmed', 'paid']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('status');
  });

  // Sponsored profiles
  await knex.schema.createTable('sponsored_profiles', (table) => {
    table.uuid('id').primary();
    table.uuid('advertiser_id').notNullable();
    table.jsonb('profile_data').notNullable();
    table.jsonb('targeting');
    table.float('budget').notNullable();
    table.float('spent').defaultTo(0);
    table.integer('impressions').defaultTo(0);
    table.integer('clicks').defaultTo(0);
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();
    table.enum('status', ['active', 'paused', 'completed', 'pending']).defaultTo('pending');
    table.timestamps(true, true);

    table.index('status');
    table.index(['start_date', 'end_date']);
  });

  // A/B tests
  await knex.schema.createTable('ab_tests', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.text('hypothesis');
    table.enum('status', ['draft', 'running', 'paused', 'completed', 'cancelled']).defaultTo('draft');
    table.jsonb('variants').notNullable();
    table.jsonb('targeting_rules');
    table.jsonb('metrics');
    table.timestamp('start_date');
    table.timestamp('end_date');
    table.string('winning_variant');
    table.timestamps(true, true);

    table.index('status');
    table.index('name');
  });

  // A/B test assignments
  await knex.schema.createTable('ab_test_assignments', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('test_id').notNullable().references('id').inTable('ab_tests').onDelete('CASCADE');
    table.string('variant_id').notNullable();
    table.timestamp('assigned_at').notNullable();

    table.unique(['user_id', 'test_id']);
    table.index('test_id');
  });

  // A/B test conversions
  await knex.schema.createTable('ab_test_conversions', (table) => {
    table.uuid('id').primary();
    table.uuid('assignment_id').notNullable().references('id').inTable('ab_test_assignments').onDelete('CASCADE');
    table.string('metric_name').notNullable();
    table.float('value').defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('assignment_id');
    table.index('metric_name');
  });

  // Notification campaigns
  await knex.schema.createTable('notification_campaigns', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.enum('type', ['push', 'email', 'in_app', 'sms']).notNullable();
    table.enum('status', ['draft', 'scheduled', 'sending', 'sent', 'cancelled']).defaultTo('draft');
    table.jsonb('targeting');
    table.jsonb('content').notNullable();
    table.timestamp('scheduled_at');
    table.timestamp('sent_at');
    table.jsonb('metrics');
    table.timestamps(true, true);

    table.index('status');
    table.index('scheduled_at');
  });

  // User segments
  await knex.schema.createTable('user_segments', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('criteria').notNullable();
    table.integer('user_count').defaultTo(0);
    table.boolean('is_auto_updating').defaultTo(true);
    table.timestamp('last_updated_at');
    table.timestamps(true, true);

    table.index('name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_segments');
  await knex.schema.dropTableIfExists('notification_campaigns');
  await knex.schema.dropTableIfExists('ab_test_conversions');
  await knex.schema.dropTableIfExists('ab_test_assignments');
  await knex.schema.dropTableIfExists('ab_tests');
  await knex.schema.dropTableIfExists('sponsored_profiles');
  await knex.schema.dropTableIfExists('affiliate_purchases');
  await knex.schema.dropTableIfExists('affiliate_clicks');
  await knex.schema.dropTableIfExists('affiliate_partners');
  await knex.schema.dropTableIfExists('ad_rewards');
  await knex.schema.dropTableIfExists('ad_impressions');
  await knex.schema.dropTableIfExists('ad_placements');
  await knex.schema.dropTableIfExists('ml_interactions');
  await knex.schema.dropTableIfExists('daily_picks');
  await knex.schema.dropTableIfExists('user_travel_mode');
  await knex.schema.dropTableIfExists('photo_verifications');
  await knex.schema.dropTableIfExists('voice_notes');
  await knex.schema.dropTableIfExists('video_views');
  await knex.schema.dropTableIfExists('video_profiles');
  await knex.schema.dropTableIfExists('video_calls');
  await knex.schema.dropTableIfExists('phone_verifications');
  await knex.schema.dropTableIfExists('user_active_items');
  await knex.schema.dropTableIfExists('wallet_transactions');
  await knex.schema.dropTableIfExists('user_wallets');
}
