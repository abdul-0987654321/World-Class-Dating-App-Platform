import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ============================================
  // ENHANCED DAILY LOGIN REWARDS SYSTEM
  // ============================================

  // Weekly bonus rewards table (every 7 days complete streak)
  await knex.schema.createTable('weekly_bonus_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('week_number').notNullable().comment('Which week milestone (1, 2, 3, etc.)');
    table.enum('reward_type', ['coins', 'super_likes', 'boosts', 'premium_trial', 'badge']).notNullable();
    table.integer('reward_amount').notNullable();
    table.uuid('badge_id').references('id').inTable('profile_badges').onDelete('SET NULL');
    table.string('title').notNullable();
    table.text('description');
    table.string('icon_name');
    table.string('icon_color');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique('week_number');
  });

  // User weekly bonus claims
  await knex.schema.createTable('user_weekly_bonus_claims', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('week_number').notNullable();
    table.integer('streak_at_claim').notNullable();
    table.jsonb('rewards_claimed').notNullable().comment('Details of rewards claimed');
    table.timestamp('claimed_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.unique(['user_id', 'week_number']);
  });

  // Insert default weekly bonus rewards
  await knex('weekly_bonus_rewards').insert([
    {
      week_number: 1,
      reward_type: 'coins',
      reward_amount: 100,
      title: '1 Week Complete!',
      description: 'You logged in 7 days straight!',
      icon_name: 'calendar-check',
      icon_color: '#4CAF50',
    },
    {
      week_number: 2,
      reward_type: 'super_likes',
      reward_amount: 3,
      title: '2 Weeks Strong!',
      description: 'Two weeks of dedication!',
      icon_name: 'calendar-check',
      icon_color: '#2196F3',
    },
    {
      week_number: 3,
      reward_type: 'boosts',
      reward_amount: 1,
      title: '3 Weeks Champion!',
      description: 'Three weeks - amazing!',
      icon_name: 'trophy',
      icon_color: '#FF9800',
    },
    {
      week_number: 4,
      reward_type: 'coins',
      reward_amount: 500,
      title: 'Month Master!',
      description: 'Full month streak! Legendary!',
      icon_name: 'crown',
      icon_color: '#9C27B0',
    },
  ]);

  // ============================================
  // ENHANCED ACHIEVEMENT BADGES SYSTEM
  // ============================================

  // Achievement badge definitions (different from profile badges)
  await knex.schema.createTable('achievement_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('slug').notNullable().unique();
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.string('icon_url');
    table.string('icon_name').notNullable();
    table.string('icon_color');
    table.string('background_color');
    table.enum('category', [
      'dating',          // Dating-related achievements
      'social',          // Social interactions
      'profile',         // Profile completion
      'engagement',      // App engagement
      'streak',          // Streak-based
      'special',         // Special events
      'collector'        // Collecting items
    ]).notNullable();
    table.enum('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary']).defaultTo('common');
    table.enum('unlock_type', [
      'count',           // Reach a count (matches, messages, etc.)
      'streak',          // Maintain a streak
      'milestone',       // Reach a milestone
      'time_based',      // Time-limited
      'special_action',  // Specific action required
      'collection'       // Collect multiple items
    ]).notNullable();
    table.jsonb('unlock_requirements').notNullable().comment('Requirements to unlock badge');
    table.integer('coin_reward').defaultTo(0);
    table.integer('xp_reward').defaultTo(0);
    table.boolean('is_hidden').defaultTo(false).comment('Hidden until unlocked');
    table.boolean('is_repeatable').defaultTo(false).comment('Can be earned multiple times');
    table.integer('max_tier').defaultTo(1).comment('Number of tiers for progressive badges');
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('category');
    table.index('rarity');
    table.index('is_active');
  });

  // User achievement badges earned
  await knex.schema.createTable('user_achievement_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('badge_id').notNullable().references('id').inTable('achievement_badges').onDelete('CASCADE');
    table.integer('current_tier').defaultTo(1);
    table.integer('current_progress').defaultTo(0);
    table.integer('target_progress').notNullable();
    table.boolean('is_unlocked').defaultTo(false);
    table.integer('times_earned').defaultTo(0);
    table.boolean('reward_claimed').defaultTo(false);
    table.boolean('is_displayed').defaultTo(false).comment('Shown on profile');
    table.timestamp('unlocked_at');
    table.timestamp('last_progress_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('badge_id');
    table.index(['user_id', 'is_unlocked']);
    table.unique(['user_id', 'badge_id']);
  });

  // Insert default achievement badges
  await knex('achievement_badges').insert([
    // Dating achievements
    {
      slug: 'first_match',
      name: 'First Spark',
      description: 'Get your first match',
      icon_name: 'heart',
      icon_color: '#E91E63',
      background_color: '#FCE4EC',
      category: 'dating',
      rarity: 'common',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'matches', target: 1 }),
      coin_reward: 50,
      xp_reward: 100,
      display_order: 1,
    },
    {
      slug: 'matchmaker_bronze',
      name: 'Matchmaker Bronze',
      description: 'Get 10 matches',
      icon_name: 'heart',
      icon_color: '#CD7F32',
      background_color: '#FFF3E0',
      category: 'dating',
      rarity: 'uncommon',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'matches', target: 10 }),
      coin_reward: 100,
      xp_reward: 250,
      max_tier: 3,
      display_order: 2,
    },
    {
      slug: 'matchmaker_silver',
      name: 'Matchmaker Silver',
      description: 'Get 50 matches',
      icon_name: 'heart',
      icon_color: '#C0C0C0',
      background_color: '#ECEFF1',
      category: 'dating',
      rarity: 'rare',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'matches', target: 50 }),
      coin_reward: 250,
      xp_reward: 500,
      display_order: 3,
    },
    {
      slug: 'matchmaker_gold',
      name: 'Matchmaker Gold',
      description: 'Get 100 matches',
      icon_name: 'heart',
      icon_color: '#FFD700',
      background_color: '#FFFDE7',
      category: 'dating',
      rarity: 'epic',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'matches', target: 100 }),
      coin_reward: 500,
      xp_reward: 1000,
      display_order: 4,
    },
    // Social achievements
    {
      slug: 'conversation_starter',
      name: 'Conversation Starter',
      description: 'Send 10 messages',
      icon_name: 'message-circle',
      icon_color: '#2196F3',
      background_color: '#E3F2FD',
      category: 'social',
      rarity: 'common',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'messages_sent', target: 10 }),
      coin_reward: 25,
      xp_reward: 50,
      display_order: 10,
    },
    {
      slug: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Send 100 messages',
      icon_name: 'message-circle',
      icon_color: '#9C27B0',
      background_color: '#F3E5F5',
      category: 'social',
      rarity: 'uncommon',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'messages_sent', target: 100 }),
      coin_reward: 100,
      xp_reward: 200,
      display_order: 11,
    },
    {
      slug: 'chat_champion',
      name: 'Chat Champion',
      description: 'Send 500 messages',
      icon_name: 'message-circle',
      icon_color: '#FF9800',
      background_color: '#FFF3E0',
      category: 'social',
      rarity: 'rare',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'messages_sent', target: 500 }),
      coin_reward: 300,
      xp_reward: 600,
      display_order: 12,
    },
    {
      slug: 'quick_responder',
      name: 'Quick Responder',
      description: 'Respond to 20 messages within 5 minutes',
      icon_name: 'zap',
      icon_color: '#4CAF50',
      background_color: '#E8F5E9',
      category: 'social',
      rarity: 'uncommon',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'quick_responses', target: 20 }),
      coin_reward: 75,
      xp_reward: 150,
      display_order: 13,
    },
    // Profile achievements
    {
      slug: 'profile_pro',
      name: 'Profile Pro',
      description: 'Complete your profile 100%',
      icon_name: 'user-check',
      icon_color: '#4CAF50',
      background_color: '#E8F5E9',
      category: 'profile',
      rarity: 'uncommon',
      unlock_type: 'milestone',
      unlock_requirements: JSON.stringify({ metric: 'profile_completion', target: 100 }),
      coin_reward: 150,
      xp_reward: 300,
      display_order: 20,
    },
    {
      slug: 'photo_star',
      name: 'Photo Star',
      description: 'Upload 6 photos',
      icon_name: 'camera',
      icon_color: '#E91E63',
      background_color: '#FCE4EC',
      category: 'profile',
      rarity: 'common',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'photos_uploaded', target: 6 }),
      coin_reward: 50,
      xp_reward: 100,
      display_order: 21,
    },
    {
      slug: 'verified_member',
      name: 'Verified Member',
      description: 'Complete photo verification',
      icon_name: 'shield-check',
      icon_color: '#2196F3',
      background_color: '#E3F2FD',
      category: 'profile',
      rarity: 'uncommon',
      unlock_type: 'special_action',
      unlock_requirements: JSON.stringify({ action: 'photo_verification_complete' }),
      coin_reward: 100,
      xp_reward: 200,
      display_order: 22,
    },
    // Engagement achievements
    {
      slug: 'daily_devotee',
      name: 'Daily Devotee',
      description: 'Claim daily rewards 7 days in a row',
      icon_name: 'calendar',
      icon_color: '#4CAF50',
      background_color: '#E8F5E9',
      category: 'engagement',
      rarity: 'uncommon',
      unlock_type: 'streak',
      unlock_requirements: JSON.stringify({ metric: 'daily_reward_streak', target: 7 }),
      coin_reward: 100,
      xp_reward: 200,
      display_order: 30,
    },
    {
      slug: 'swipe_machine',
      name: 'Swipe Machine',
      description: 'Swipe on 100 profiles',
      icon_name: 'repeat',
      icon_color: '#FF5722',
      background_color: '#FBE9E7',
      category: 'engagement',
      rarity: 'common',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'swipes', target: 100 }),
      coin_reward: 50,
      xp_reward: 100,
      display_order: 31,
    },
    {
      slug: 'power_swiper',
      name: 'Power Swiper',
      description: 'Swipe on 1000 profiles',
      icon_name: 'repeat',
      icon_color: '#9C27B0',
      background_color: '#F3E5F5',
      category: 'engagement',
      rarity: 'rare',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'swipes', target: 1000 }),
      coin_reward: 200,
      xp_reward: 400,
      display_order: 32,
    },
    // Streak achievements
    {
      slug: 'week_warrior',
      name: 'Week Warrior',
      description: 'Maintain a 7-day login streak',
      icon_name: 'fire',
      icon_color: '#FF5722',
      background_color: '#FBE9E7',
      category: 'streak',
      rarity: 'uncommon',
      unlock_type: 'streak',
      unlock_requirements: JSON.stringify({ metric: 'login_streak', target: 7 }),
      coin_reward: 75,
      xp_reward: 150,
      display_order: 40,
    },
    {
      slug: 'month_master',
      name: 'Month Master',
      description: 'Maintain a 30-day login streak',
      icon_name: 'fire',
      icon_color: '#FF9800',
      background_color: '#FFF3E0',
      category: 'streak',
      rarity: 'rare',
      unlock_type: 'streak',
      unlock_requirements: JSON.stringify({ metric: 'login_streak', target: 30 }),
      coin_reward: 300,
      xp_reward: 600,
      display_order: 41,
    },
    {
      slug: 'century_champion',
      name: 'Century Champion',
      description: 'Maintain a 100-day login streak',
      icon_name: 'fire',
      icon_color: '#F44336',
      background_color: '#FFEBEE',
      category: 'streak',
      rarity: 'legendary',
      unlock_type: 'streak',
      unlock_requirements: JSON.stringify({ metric: 'login_streak', target: 100 }),
      coin_reward: 1000,
      xp_reward: 2000,
      display_order: 42,
    },
    // Special achievements
    {
      slug: 'super_liker',
      name: 'Super Liker',
      description: 'Use 10 Super Likes',
      icon_name: 'star',
      icon_color: '#00BCD4',
      background_color: '#E0F7FA',
      category: 'special',
      rarity: 'uncommon',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'super_likes_used', target: 10 }),
      coin_reward: 50,
      xp_reward: 100,
      display_order: 50,
    },
    {
      slug: 'boost_master',
      name: 'Boost Master',
      description: 'Use 5 Boosts',
      icon_name: 'rocket',
      icon_color: '#FF5722',
      background_color: '#FBE9E7',
      category: 'special',
      rarity: 'uncommon',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'boosts_used', target: 5 }),
      coin_reward: 75,
      xp_reward: 150,
      display_order: 51,
    },
    {
      slug: 'early_bird',
      name: 'Early Bird',
      description: 'Log in before 7 AM for 5 days',
      icon_name: 'sunrise',
      icon_color: '#FF9800',
      background_color: '#FFF3E0',
      category: 'special',
      rarity: 'rare',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'early_logins', target: 5 }),
      coin_reward: 100,
      xp_reward: 200,
      is_hidden: true,
      display_order: 52,
    },
    {
      slug: 'night_owl',
      name: 'Night Owl',
      description: 'Log in after 11 PM for 5 days',
      icon_name: 'moon',
      icon_color: '#3F51B5',
      background_color: '#E8EAF6',
      category: 'special',
      rarity: 'rare',
      unlock_type: 'count',
      unlock_requirements: JSON.stringify({ metric: 'late_logins', target: 5 }),
      coin_reward: 100,
      xp_reward: 200,
      is_hidden: true,
      display_order: 53,
    },
  ]);

  // ============================================
  // ENHANCED COIN ECONOMY
  // ============================================

  // Coin earning events (for tracking how users earn coins)
  await knex.schema.createTable('coin_earning_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('event_type').notNullable().comment('Type of earning event');
    table.string('event_name').notNullable();
    table.text('description');
    table.integer('base_coins').notNullable();
    table.decimal('multiplier_min', 5, 2).defaultTo(1.0);
    table.decimal('multiplier_max', 5, 2).defaultTo(1.0);
    table.integer('daily_limit').comment('Max times per day');
    table.integer('total_limit').comment('Max times ever');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique('event_type');
  });

  // User coin earning log (detailed tracking)
  await knex.schema.createTable('user_coin_earnings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('event_id').notNullable().references('id').inTable('coin_earning_events').onDelete('CASCADE');
    table.integer('coins_earned').notNullable();
    table.decimal('multiplier_applied', 5, 2).defaultTo(1.0);
    table.string('source').comment('Where the event occurred');
    table.jsonb('metadata').comment('Additional context');
    table.timestamp('earned_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('event_id');
    table.index(['user_id', 'earned_at']);
  });

  // Insert default coin earning events
  await knex('coin_earning_events').insert([
    {
      event_type: 'daily_login',
      event_name: 'Daily Login',
      description: 'Log in to the app daily',
      base_coins: 5,
      daily_limit: 1,
    },
    {
      event_type: 'daily_reward_claim',
      event_name: 'Daily Reward Claimed',
      description: 'Claim your daily reward',
      base_coins: 10,
      multiplier_max: 2.0,
      daily_limit: 1,
    },
    {
      event_type: 'match_made',
      event_name: 'New Match!',
      description: 'Get a new match',
      base_coins: 3,
      daily_limit: 20,
    },
    {
      event_type: 'message_sent',
      event_name: 'Message Sent',
      description: 'Send a message to a match',
      base_coins: 1,
      daily_limit: 50,
    },
    {
      event_type: 'profile_complete',
      event_name: 'Profile Completed',
      description: 'Complete your profile to 100%',
      base_coins: 100,
      total_limit: 1,
    },
    {
      event_type: 'photo_verified',
      event_name: 'Photo Verified',
      description: 'Complete photo verification',
      base_coins: 50,
      total_limit: 1,
    },
    {
      event_type: 'streak_milestone',
      event_name: 'Streak Milestone',
      description: 'Reach a streak milestone',
      base_coins: 25,
      multiplier_max: 10.0,
    },
    {
      event_type: 'achievement_unlocked',
      event_name: 'Achievement Unlocked',
      description: 'Unlock a new achievement',
      base_coins: 10,
      multiplier_max: 50.0,
    },
    {
      event_type: 'referral_signup',
      event_name: 'Referral Signup',
      description: 'Someone you referred signs up',
      base_coins: 100,
    },
    {
      event_type: 'referral_premium',
      event_name: 'Referral Goes Premium',
      description: 'Someone you referred subscribes',
      base_coins: 500,
    },
    {
      event_type: 'weekly_bonus',
      event_name: 'Weekly Streak Bonus',
      description: 'Complete a 7-day streak',
      base_coins: 100,
    },
    {
      event_type: 'community_contribution',
      event_name: 'Community Contribution',
      description: 'Active in community features',
      base_coins: 5,
      daily_limit: 10,
    },
  ]);

  // ============================================
  // GAMIFICATION SUMMARY TABLES
  // ============================================

  // User gamification summary (denormalized for quick access)
  await knex.schema.createTable('user_gamification_summary', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // Currency
    table.integer('total_coins_earned').defaultTo(0);
    table.integer('total_coins_spent').defaultTo(0);
    table.integer('current_coin_balance').defaultTo(0);

    // Streaks
    table.integer('current_login_streak').defaultTo(0);
    table.integer('longest_login_streak').defaultTo(0);
    table.timestamp('last_login_at');

    // Achievements
    table.integer('badges_earned').defaultTo(0);
    table.integer('achievements_unlocked').defaultTo(0);
    table.integer('total_xp').defaultTo(0);
    table.integer('current_level').defaultTo(1);

    // Daily rewards
    table.integer('total_daily_claims').defaultTo(0);
    table.integer('current_daily_streak').defaultTo(0);
    table.integer('day_in_reward_cycle').defaultTo(1);
    table.timestamp('last_daily_claim_at');

    // Activity
    table.integer('total_matches').defaultTo(0);
    table.integer('total_messages_sent').defaultTo(0);
    table.integer('total_swipes').defaultTo(0);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('current_level');
    table.index('total_xp');
    table.index('longest_login_streak');
  });

  // Gamification levels configuration
  await knex.schema.createTable('gamification_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('level').notNullable().unique();
    table.integer('xp_required').notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.string('icon_name');
    table.string('icon_color');
    table.integer('coin_reward').defaultTo(0);
    table.integer('super_likes_reward').defaultTo(0);
    table.integer('boosts_reward').defaultTo(0);
    table.jsonb('unlock_features').comment('Features unlocked at this level');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Insert default levels
  await knex('gamification_levels').insert([
    { level: 1, xp_required: 0, title: 'Newcomer', icon_name: 'seedling', icon_color: '#8BC34A' },
    { level: 2, xp_required: 100, title: 'Explorer', icon_name: 'compass', icon_color: '#4CAF50', coin_reward: 25 },
    { level: 3, xp_required: 250, title: 'Rising Star', icon_name: 'star', icon_color: '#FFEB3B', coin_reward: 50 },
    { level: 4, xp_required: 500, title: 'Social Spark', icon_name: 'zap', icon_color: '#FF9800', coin_reward: 75, super_likes_reward: 1 },
    { level: 5, xp_required: 1000, title: 'Connection Pro', icon_name: 'users', icon_color: '#2196F3', coin_reward: 100, super_likes_reward: 2 },
    { level: 6, xp_required: 2000, title: 'Heart Hunter', icon_name: 'heart', icon_color: '#E91E63', coin_reward: 150, super_likes_reward: 2, boosts_reward: 1 },
    { level: 7, xp_required: 3500, title: 'Love Expert', icon_name: 'award', icon_color: '#9C27B0', coin_reward: 200, super_likes_reward: 3, boosts_reward: 1 },
    { level: 8, xp_required: 5000, title: 'Dating Guru', icon_name: 'sparkles', icon_color: '#673AB7', coin_reward: 300, super_likes_reward: 5, boosts_reward: 2 },
    { level: 9, xp_required: 7500, title: 'Romance Master', icon_name: 'crown', icon_color: '#FF5722', coin_reward: 500, super_likes_reward: 5, boosts_reward: 2 },
    { level: 10, xp_required: 10000, title: 'Love Legend', icon_name: 'diamond', icon_color: '#00BCD4', coin_reward: 1000, super_likes_reward: 10, boosts_reward: 5 },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gamification_levels');
  await knex.schema.dropTableIfExists('user_gamification_summary');
  await knex.schema.dropTableIfExists('user_coin_earnings');
  await knex.schema.dropTableIfExists('coin_earning_events');
  await knex.schema.dropTableIfExists('user_achievement_badges');
  await knex.schema.dropTableIfExists('achievement_badges');
  await knex.schema.dropTableIfExists('user_weekly_bonus_claims');
  await knex.schema.dropTableIfExists('weekly_bonus_rewards');
}
