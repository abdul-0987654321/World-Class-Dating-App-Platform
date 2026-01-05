import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Profile badges table (verified, popular, active, etc.)
  await knex.schema.createTable('profile_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique().comment('Unique identifier for badge');
    table.string('name').notNullable();
    table.text('description').notNullable();
    table
      .enum('type', ['verification', 'status', 'achievement', 'special', 'seasonal', 'premium'])
      .notNullable();
    table.enum('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary']).defaultTo('common');
    table.string('icon_name').notNullable();
    table.string('icon_color');
    table.string('background_color');
    table.jsonb('requirements').comment('Requirements to earn badge');
    table
      .boolean('is_auto_awarded')
      .defaultTo(false)
      .comment('Automatically awarded when requirements met');
    table.boolean('is_permanent').defaultTo(true).comment('Badge never expires');
    table.integer('duration_days').comment('Days badge is valid (if not permanent)');
    table.boolean('is_visible_on_profile').defaultTo(true);
    table.integer('display_priority').defaultTo(0).comment('Higher priority shows first');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('type');
    table.index('rarity');
    table.index('is_active');
    table.index('display_priority');
  });

  // User profile badges table
  await knex.schema.createTable('user_profile_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('badge_id')
      .notNullable()
      .references('id')
      .inTable('profile_badges')
      .onDelete('CASCADE');
    table.boolean('is_equipped').defaultTo(true).comment('Whether badge is shown on profile');
    table.integer('display_order').comment('Order of badge display');
    table.timestamp('earned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').comment('When badge expires (for temporary badges)');
    table.jsonb('metadata').comment('Additional badge information');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('badge_id');
    table.index(['user_id', 'is_equipped']);
    table.index('expires_at');
    table.unique(['user_id', 'badge_id']);
  });

  // Badge collections (sets of badges that unlock bonuses)
  await knex.schema.createTable('badge_collections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('required_badge_ids').notNullable().comment('Array of badge IDs needed');
    table.integer('coin_reward').defaultTo(0);
    table.integer('xp_reward').defaultTo(0);
    table.jsonb('bonus_rewards').comment('Additional rewards for completing collection');
    table.string('collection_badge_icon');
    table.string('collection_badge_color');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // User badge collections
  await knex.schema.createTable('user_badge_collections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('collection_id')
      .notNullable()
      .references('id')
      .inTable('badge_collections')
      .onDelete('CASCADE');
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('completed_at');
    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('collection_id');
    table.index(['user_id', 'is_completed']);
    table.unique(['user_id', 'collection_id']);
  });

  // Insert default profile badges
  await knex('profile_badges').insert([
    // Verification Badges
    {
      key: 'VERIFIED_PHONE',
      name: 'Phone Verified',
      description: 'Phone number verified',
      type: 'verification',
      rarity: 'common',
      icon_name: 'shield-check',
      icon_color: '#4CAF50',
      background_color: '#E8F5E9',
      requirements: JSON.stringify({ verification: 'phone' }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 100,
    },
    {
      key: 'VERIFIED_PHOTO',
      name: 'Photo Verified',
      description: 'Identity verified with photo',
      type: 'verification',
      rarity: 'uncommon',
      icon_name: 'badge-check',
      icon_color: '#2196F3',
      background_color: '#E3F2FD',
      requirements: JSON.stringify({ verification: 'photo' }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 95,
    },
    {
      key: 'VERIFIED_EMAIL',
      name: 'Email Verified',
      description: 'Email address verified',
      type: 'verification',
      rarity: 'common',
      icon_name: 'mail-check',
      icon_color: '#FF9800',
      background_color: '#FFF3E0',
      requirements: JSON.stringify({ verification: 'email' }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: false,
      display_priority: 90,
    },
    // Status Badges
    {
      key: 'NEW_MEMBER',
      name: 'New Here',
      description: 'Joined in the last 7 days',
      type: 'status',
      rarity: 'common',
      icon_name: 'sparkles',
      icon_color: '#9C27B0',
      background_color: '#F3E5F5',
      requirements: JSON.stringify({ days_since_joined: { max: 7 } }),
      is_auto_awarded: true,
      is_permanent: false,
      duration_days: 7,
      is_visible_on_profile: true,
      display_priority: 80,
    },
    {
      key: 'ACTIVE_TODAY',
      name: 'Active Now',
      description: 'Active in the last hour',
      type: 'status',
      rarity: 'common',
      icon_name: 'zap',
      icon_color: '#4CAF50',
      background_color: '#E8F5E9',
      requirements: JSON.stringify({ last_active_minutes: { max: 60 } }),
      is_auto_awarded: true,
      is_permanent: false,
      duration_days: 1,
      is_visible_on_profile: true,
      display_priority: 85,
    },
    {
      key: 'POPULAR',
      name: 'Popular',
      description: 'Receives lots of likes',
      type: 'status',
      rarity: 'rare',
      icon_name: 'trending-up',
      icon_color: '#FF5722',
      background_color: '#FBE9E7',
      requirements: JSON.stringify({ likes_per_week: { min: 50 } }),
      is_auto_awarded: true,
      is_permanent: false,
      duration_days: 7,
      is_visible_on_profile: true,
      display_priority: 75,
    },
    {
      key: 'RESPONSIVE',
      name: 'Quick Responder',
      description: 'Responds to messages quickly',
      type: 'status',
      rarity: 'uncommon',
      icon_name: 'message-circle',
      icon_color: '#2196F3',
      background_color: '#E3F2FD',
      requirements: JSON.stringify({ avg_response_time_minutes: { max: 30 } }),
      is_auto_awarded: true,
      is_permanent: false,
      duration_days: 7,
      is_visible_on_profile: true,
      display_priority: 70,
    },
    {
      key: 'CONVERSATION_STARTER',
      name: 'Conversation Starter',
      description: 'Great at starting conversations',
      type: 'status',
      rarity: 'uncommon',
      icon_name: 'message-square',
      icon_color: '#00BCD4',
      background_color: '#E0F7FA',
      requirements: JSON.stringify({ first_message_rate: { min: 0.8 } }),
      is_auto_awarded: true,
      is_permanent: false,
      duration_days: 30,
      is_visible_on_profile: true,
      display_priority: 65,
    },
    // Achievement Badges
    {
      key: 'VETERAN',
      name: 'Veteran',
      description: 'Member for over 6 months',
      type: 'achievement',
      rarity: 'rare',
      icon_name: 'award',
      icon_color: '#FF9800',
      background_color: '#FFF3E0',
      requirements: JSON.stringify({ days_since_joined: { min: 180 } }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 60,
    },
    {
      key: 'MATCHMAKER',
      name: 'Matchmaker',
      description: '100+ matches made',
      type: 'achievement',
      rarity: 'epic',
      icon_name: 'heart',
      icon_color: '#E91E63',
      background_color: '#FCE4EC',
      requirements: JSON.stringify({ total_matches: { min: 100 } }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 55,
    },
    {
      key: 'SOCIAL_BUTTERFLY',
      name: 'Social Butterfly',
      description: '500+ messages sent',
      type: 'achievement',
      rarity: 'rare',
      icon_name: 'users',
      icon_color: '#9C27B0',
      background_color: '#F3E5F5',
      requirements: JSON.stringify({ total_messages: { min: 500 } }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 50,
    },
    {
      key: 'STREAK_MASTER',
      name: 'Streak Master',
      description: '30+ day login streak',
      type: 'achievement',
      rarity: 'epic',
      icon_name: 'fire',
      icon_color: '#FF5722',
      background_color: '#FBE9E7',
      requirements: JSON.stringify({ login_streak: { min: 30 } }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 45,
    },
    // Premium Badges
    {
      key: 'PREMIUM_MEMBER',
      name: 'Premium',
      description: 'Premium subscriber',
      type: 'premium',
      rarity: 'epic',
      icon_name: 'crown',
      icon_color: '#FFD700',
      background_color: '#FFFDE7',
      requirements: JSON.stringify({ subscription: 'active' }),
      is_auto_awarded: true,
      is_permanent: false,
      is_visible_on_profile: true,
      display_priority: 105,
    },
    {
      key: 'VIP',
      name: 'VIP',
      description: 'VIP member',
      type: 'premium',
      rarity: 'legendary',
      icon_name: 'star',
      icon_color: '#FF1493',
      background_color: '#FCE4EC',
      requirements: JSON.stringify({ subscription_tier: 'vip' }),
      is_auto_awarded: true,
      is_permanent: false,
      is_visible_on_profile: true,
      display_priority: 110,
    },
    {
      key: 'EARLY_ADOPTER',
      name: 'Early Adopter',
      description: 'One of the first 10,000 members',
      type: 'special',
      rarity: 'legendary',
      icon_name: 'gift',
      icon_color: '#00BCD4',
      background_color: '#E0F7FA',
      requirements: JSON.stringify({ user_number: { max: 10000 } }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 40,
    },
    // Seasonal Badges
    {
      key: 'VALENTINE_2025',
      name: 'Valentine 2025',
      description: "Active during Valentine's Day 2025",
      type: 'seasonal',
      rarity: 'rare',
      icon_name: 'heart',
      icon_color: '#E91E63',
      background_color: '#FCE4EC',
      requirements: JSON.stringify({ active_during_event: 'valentine_2025' }),
      is_auto_awarded: true,
      is_permanent: true,
      is_visible_on_profile: true,
      display_priority: 30,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_badge_collections');
  await knex.schema.dropTableIfExists('badge_collections');
  await knex.schema.dropTableIfExists('user_profile_badges');
  await knex.schema.dropTableIfExists('profile_badges');
}
