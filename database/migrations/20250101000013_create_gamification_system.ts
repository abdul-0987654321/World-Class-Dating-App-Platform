import { Knex } from 'knex';

/**
 * Migration: Create Gamification System Tables
 * Description: Comprehensive gamification system with rewards, badges, achievements, streaks, and XP
 */
export async function up(knex: Knex): Promise<void> {
  // Create user_xp table (Experience Points System)
  await knex.schema.createTable('user_xp', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

    // XP tracking
    table.integer('total_xp').notNullable().defaultTo(0);
    table.integer('current_level').notNullable().defaultTo(1);
    table.integer('xp_to_next_level').notNullable().defaultTo(100);

    // Lifetime stats
    table.integer('lifetime_xp_earned').notNullable().defaultTo(0);
    table.integer('highest_level_reached').notNullable().defaultTo(1);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('current_level');
    table.index('total_xp');
  });

  // Create xp_transactions table
  await knex.schema.createTable('xp_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Transaction details
    table.integer('xp_amount').notNullable();
    table.integer('level_before').notNullable();
    table.integer('level_after').notNullable();
    table.integer('total_xp_after').notNullable();

    // Activity tracking
    table.enum('activity_type', [
      'profile_complete',
      'photo_upload',
      'profile_update',
      'daily_login',
      'send_message',
      'receive_message',
      'match_made',
      'super_like_sent',
      'conversation_starter',
      'response_received',
      'date_scheduled',
      'profile_verified',
      'streak_milestone',
      'challenge_completed',
      'achievement_unlocked'
    ]).notNullable();

    table.text('description').nullable();
    table.string('reference_type', 50).nullable();
    table.uuid('reference_id').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('activity_type');
    table.index(['user_id', 'created_at']);
    table.index('created_at');
  });

  // Create user_streaks table
  await knex.schema.createTable('user_streaks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

    // Login streak
    table.integer('login_streak').notNullable().defaultTo(0);
    table.integer('longest_login_streak').notNullable().defaultTo(0);
    table.timestamp('last_login_date').nullable();
    table.timestamp('streak_started_at').nullable();

    // Conversation streak
    table.integer('conversation_streak').notNullable().defaultTo(0);
    table.integer('longest_conversation_streak').notNullable().defaultTo(0);
    table.timestamp('last_conversation_date').nullable();

    // Match streak
    table.integer('match_streak').notNullable().defaultTo(0);
    table.integer('longest_match_streak').notNullable().defaultTo(0);
    table.timestamp('last_match_date').nullable();

    // Streak protection (premium feature)
    table.integer('streak_freezes_available').notNullable().defaultTo(0);
    table.timestamp('last_freeze_used_at').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('login_streak');
    table.index('conversation_streak');
  });

  // Create streak_history table
  await knex.schema.createTable('streak_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Streak details
    table.enum('streak_type', ['login', 'conversation', 'match']).notNullable();
    table.integer('streak_count').notNullable();
    table.enum('action', ['increased', 'broken', 'frozen']).notNullable();

    // Milestone tracking
    table.boolean('is_milestone').defaultTo(false);
    table.integer('milestone_level').nullable(); // 7, 30, 100 days, etc.

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('streak_type');
    table.index(['user_id', 'streak_type']);
    table.index('created_at');
  });

  // Create daily_rewards table
  await knex.schema.createTable('daily_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Reward details
    table.date('reward_date').notNullable();
    table.integer('day_number').notNullable(); // Day 1, 2, 3... of streak
    table.boolean('is_claimed').notNullable().defaultTo(false);
    table.timestamp('claimed_at').nullable();

    // Rewards granted
    table.integer('coins_granted').defaultTo(0);
    table.integer('boosts_granted').defaultTo(0);
    table.integer('super_likes_granted').defaultTo(0);
    table.integer('xp_granted').defaultTo(0);

    // Bonus multiplier (for streaks)
    table.decimal('bonus_multiplier', 3, 2).defaultTo(1.00);

    // Timestamps
    table.timestamps(true, true);

    // Unique constraint on user_id and reward_date
    table.unique(['user_id', 'reward_date']);

    // Indexes
    table.index('user_id');
    table.index('reward_date');
    table.index(['user_id', 'is_claimed']);
    table.index('created_at');
  });

  // Create badges table (badge definitions)
  await knex.schema.createTable('badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Badge details
    table.string('name', 100).notNullable().unique();
    table.string('slug', 100).notNullable().unique();
    table.text('description').notNullable();
    table.string('icon_url', 500).nullable();
    table.string('color_code', 7).nullable(); // Hex color

    // Badge category
    table.enum('category', [
      'profile',
      'activity',
      'milestone',
      'achievement',
      'special',
      'seasonal',
      'premium'
    ]).notNullable();

    // Badge rarity
    table.enum('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary'])
      .notNullable().defaultTo('common');

    // Display settings
    table.integer('display_order').defaultTo(0);
    table.boolean('is_visible').defaultTo(true);
    table.boolean('is_active').defaultTo(true);

    // Requirements (stored as JSONB for flexibility)
    table.jsonb('requirements').defaultTo('{}');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('slug');
    table.index('category');
    table.index('rarity');
    table.index('is_active');
  });

  // Create user_badges table (badges earned by users)
  await knex.schema.createTable('user_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('badge_id').notNullable()
      .references('id').inTable('badges').onDelete('CASCADE');

    // Badge earned details
    table.timestamp('earned_at').notNullable().defaultTo(knex.fn.now());
    table.integer('progress_value').nullable(); // For progressive badges
    table.text('earned_note').nullable();

    // Display settings
    table.boolean('is_displayed_on_profile').defaultTo(false);
    table.integer('display_position').nullable(); // For ordering on profile

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint - user can only earn each badge once
    table.unique(['user_id', 'badge_id']);

    // Indexes
    table.index('user_id');
    table.index('badge_id');
    table.index(['user_id', 'is_displayed_on_profile']);
    table.index('earned_at');
  });

  // Create achievements table (achievement definitions)
  await knex.schema.createTable('achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Achievement details
    table.string('name', 100).notNullable().unique();
    table.string('slug', 100).notNullable().unique();
    table.text('description').notNullable();
    table.string('icon_url', 500).nullable();

    // Achievement type
    table.enum('type', [
      'match_count',
      'message_count',
      'login_streak',
      'profile_completion',
      'social',
      'premium',
      'special'
    ]).notNullable();

    // Progression
    table.boolean('is_progressive').defaultTo(false); // Can be earned multiple times
    table.integer('target_value').nullable(); // e.g., 10 matches, 100 messages
    table.integer('current_tier').defaultTo(1); // For multi-tier achievements

    // Rewards
    table.integer('xp_reward').defaultTo(0);
    table.integer('coin_reward').defaultTo(0);
    table.uuid('badge_reward_id').nullable()
      .references('id').inTable('badges').onDelete('SET NULL');

    // Display settings
    table.boolean('is_hidden').defaultTo(false); // Secret achievements
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('slug');
    table.index('type');
    table.index('is_active');
  });

  // Create user_achievements table (achievements earned by users)
  await knex.schema.createTable('user_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('achievement_id').notNullable()
      .references('id').inTable('achievements').onDelete('CASCADE');

    // Progress tracking
    table.integer('current_progress').notNullable().defaultTo(0);
    table.integer('target_progress').notNullable();
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.timestamp('completed_at').nullable();

    // Tier tracking (for progressive achievements)
    table.integer('current_tier').defaultTo(1);
    table.integer('times_completed').defaultTo(0);

    // Notifications
    table.boolean('completion_notified').defaultTo(false);

    // Timestamps
    table.timestamps(true, true);

    // For progressive achievements, allow multiple entries
    // For non-progressive, user_id + achievement_id should be unique
    table.index('user_id');
    table.index('achievement_id');
    table.index(['user_id', 'is_completed']);
    table.index(['user_id', 'achievement_id']);
  });

  // Create weekly_challenges table
  await knex.schema.createTable('weekly_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Challenge details
    table.string('name', 100).notNullable();
    table.text('description').notNullable();
    table.string('icon_url', 500).nullable();

    // Challenge type
    table.enum('challenge_type', [
      'send_messages',
      'make_matches',
      'complete_profile',
      'swipe_count',
      'login_days',
      'conversation_starters',
      'photo_uploads'
    ]).notNullable();

    // Requirements
    table.integer('target_value').notNullable(); // e.g., send 50 messages
    table.jsonb('requirements').defaultTo('{}');

    // Active period
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_active').defaultTo(true);

    // Rewards
    table.integer('xp_reward').defaultTo(0);
    table.integer('coin_reward').defaultTo(0);
    table.integer('boost_reward').defaultTo(0);
    table.integer('super_like_reward').defaultTo(0);
    table.uuid('badge_reward_id').nullable()
      .references('id').inTable('badges').onDelete('SET NULL');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('challenge_type');
    table.index(['start_date', 'end_date']);
    table.index('is_active');
  });

  // Create user_challenge_progress table
  await knex.schema.createTable('user_challenge_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('challenge_id').notNullable()
      .references('id').inTable('weekly_challenges').onDelete('CASCADE');

    // Progress tracking
    table.integer('current_progress').notNullable().defaultTo(0);
    table.integer('target_progress').notNullable();
    table.decimal('completion_percentage', 5, 2).defaultTo(0.00);

    // Status
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.timestamp('completed_at').nullable();
    table.boolean('rewards_claimed').defaultTo(false);
    table.timestamp('rewards_claimed_at').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Unique constraint
    table.unique(['user_id', 'challenge_id']);

    // Indexes
    table.index('user_id');
    table.index('challenge_id');
    table.index(['user_id', 'is_completed']);
  });

  // Create reward_history table
  await knex.schema.createTable('reward_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Reward details
    table.enum('reward_type', [
      'daily_login',
      'streak_bonus',
      'achievement',
      'challenge',
      'level_up',
      'milestone',
      'special_event',
      'referral',
      'profile_completion'
    ]).notNullable();

    table.string('reward_name', 100).notNullable();
    table.text('description').nullable();

    // Rewards granted
    table.integer('coins_granted').defaultTo(0);
    table.integer('boosts_granted').defaultTo(0);
    table.integer('super_likes_granted').defaultTo(0);
    table.integer('xp_granted').defaultTo(0);
    table.uuid('badge_granted_id').nullable()
      .references('id').inTable('badges').onDelete('SET NULL');

    // Reference to source
    table.string('reference_type', 50).nullable(); // 'achievement', 'challenge', 'streak'
    table.uuid('reference_id').nullable();

    // Timestamps
    table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('reward_type');
    table.index(['user_id', 'granted_at']);
    table.index('granted_at');
  });

  // Insert default badges
  await knex('badges').insert([
    {
      name: 'New Member',
      slug: 'new_member',
      description: 'Welcome to the community!',
      category: 'profile',
      rarity: 'common',
      display_order: 1,
      requirements: JSON.stringify({ auto_grant_on_signup: true }),
    },
    {
      name: 'Verified',
      slug: 'verified',
      description: 'Profile verified with photo verification',
      category: 'profile',
      rarity: 'uncommon',
      display_order: 2,
      requirements: JSON.stringify({ photo_verified: true }),
    },
    {
      name: 'Popular',
      slug: 'popular',
      description: 'Received 100+ likes',
      category: 'activity',
      rarity: 'rare',
      display_order: 3,
      requirements: JSON.stringify({ likes_received: 100 }),
    },
    {
      name: 'Conversation Starter',
      slug: 'conversation_starter',
      description: 'Started 50 conversations',
      category: 'activity',
      rarity: 'uncommon',
      display_order: 4,
      requirements: JSON.stringify({ conversations_started: 50 }),
    },
    {
      name: 'Week Warrior',
      slug: 'week_warrior',
      description: '7-day login streak',
      category: 'milestone',
      rarity: 'uncommon',
      display_order: 5,
      requirements: JSON.stringify({ login_streak: 7 }),
    },
    {
      name: 'Month Master',
      slug: 'month_master',
      description: '30-day login streak',
      category: 'milestone',
      rarity: 'rare',
      display_order: 6,
      requirements: JSON.stringify({ login_streak: 30 }),
    },
    {
      name: 'Match Maker',
      slug: 'match_maker',
      description: 'Made 10 matches',
      category: 'achievement',
      rarity: 'uncommon',
      display_order: 7,
      requirements: JSON.stringify({ matches: 10 }),
    },
    {
      name: 'Super Matcher',
      slug: 'super_matcher',
      description: 'Made 100 matches',
      category: 'achievement',
      rarity: 'epic',
      display_order: 8,
      requirements: JSON.stringify({ matches: 100 }),
    },
    {
      name: 'Profile Perfectionist',
      slug: 'profile_perfectionist',
      description: '100% profile completion',
      category: 'profile',
      rarity: 'uncommon',
      display_order: 9,
      requirements: JSON.stringify({ profile_completion: 100 }),
    },
    {
      name: 'Early Adopter',
      slug: 'early_adopter',
      description: 'Joined in the first month',
      category: 'special',
      rarity: 'legendary',
      display_order: 10,
      requirements: JSON.stringify({ joined_before: '2025-02-01' }),
    },
  ]);

  // Insert default achievements
  await knex('achievements').insert([
    {
      name: 'First Match',
      slug: 'first_match',
      description: 'Make your first match',
      type: 'match_count',
      is_progressive: false,
      target_value: 1,
      xp_reward: 50,
      coin_reward: 5,
      display_order: 1,
    },
    {
      name: '10 Matches',
      slug: '10_matches',
      description: 'Make 10 matches',
      type: 'match_count',
      is_progressive: false,
      target_value: 10,
      xp_reward: 100,
      coin_reward: 10,
      display_order: 2,
    },
    {
      name: '50 Matches',
      slug: '50_matches',
      description: 'Make 50 matches',
      type: 'match_count',
      is_progressive: false,
      target_value: 50,
      xp_reward: 250,
      coin_reward: 25,
      display_order: 3,
    },
    {
      name: '100 Matches',
      slug: '100_matches',
      description: 'Make 100 matches',
      type: 'match_count',
      is_progressive: false,
      target_value: 100,
      xp_reward: 500,
      coin_reward: 50,
      display_order: 4,
    },
    {
      name: 'Conversation Starter',
      slug: 'conversation_starter',
      description: 'Send 10 first messages',
      type: 'message_count',
      is_progressive: false,
      target_value: 10,
      xp_reward: 75,
      coin_reward: 10,
      display_order: 5,
    },
    {
      name: 'Social Butterfly',
      slug: 'social_butterfly',
      description: 'Send 100 messages',
      type: 'message_count',
      is_progressive: false,
      target_value: 100,
      xp_reward: 200,
      coin_reward: 20,
      display_order: 6,
    },
    {
      name: 'Week Streak',
      slug: 'week_streak',
      description: 'Login for 7 consecutive days',
      type: 'login_streak',
      is_progressive: false,
      target_value: 7,
      xp_reward: 150,
      coin_reward: 15,
      display_order: 7,
    },
    {
      name: 'Month Streak',
      slug: 'month_streak',
      description: 'Login for 30 consecutive days',
      type: 'login_streak',
      is_progressive: false,
      target_value: 30,
      xp_reward: 500,
      coin_reward: 50,
      display_order: 8,
    },
    {
      name: 'Profile Complete',
      slug: 'profile_complete',
      description: 'Complete your profile 100%',
      type: 'profile_completion',
      is_progressive: false,
      target_value: 100,
      xp_reward: 100,
      coin_reward: 10,
      display_order: 9,
    },
  ]);

  // Create trigger to automatically level up users
  await knex.raw(`
    CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
    RETURNS TABLE(level INTEGER, xp_to_next INTEGER) AS $$
    DECLARE
      current_level INTEGER := 1;
      xp_required INTEGER := 100;
      total_xp_for_level INTEGER := 0;
    BEGIN
      -- Level formula: XP required = 100 * level^1.5
      WHILE total_xp_for_level + xp_required <= xp LOOP
        total_xp_for_level := total_xp_for_level + xp_required;
        current_level := current_level + 1;
        xp_required := FLOOR(100 * POWER(current_level, 1.5));
      END LOOP;

      RETURN QUERY SELECT current_level, xp_required - (xp - total_xp_for_level);
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION update_user_level()
    RETURNS TRIGGER AS $$
    DECLARE
      level_info RECORD;
      old_level INTEGER;
    BEGIN
      -- Get current level before update
      SELECT current_level INTO old_level FROM user_xp WHERE user_id = NEW.user_id;

      -- Calculate new level based on total XP
      SELECT * INTO level_info FROM calculate_level_from_xp(NEW.total_xp_after);

      -- Update user_xp table
      UPDATE user_xp
      SET
        total_xp = NEW.total_xp_after,
        current_level = level_info.level,
        xp_to_next_level = level_info.xp_to_next,
        lifetime_xp_earned = lifetime_xp_earned + NEW.xp_amount,
        highest_level_reached = GREATEST(highest_level_reached, level_info.level),
        updated_at = NOW()
      WHERE user_id = NEW.user_id;

      -- If level increased, grant level-up rewards
      IF level_info.level > old_level THEN
        -- Grant coins based on new level (10 coins per level)
        INSERT INTO coin_transactions (user_id, type, amount, description, reference_type, reference_id)
        VALUES (
          NEW.user_id,
          'earned',
          level_info.level * 10,
          'Level ' || level_info.level || ' reached!',
          'level_up',
          NEW.id
        );

        -- Log reward in reward_history
        INSERT INTO reward_history (user_id, reward_type, reward_name, description, coins_granted, xp_granted, reference_type, reference_id)
        VALUES (
          NEW.user_id,
          'level_up',
          'Level ' || level_info.level || ' Reward',
          'Congratulations on reaching level ' || level_info.level || '!',
          level_info.level * 10,
          0,
          'xp_transaction',
          NEW.id
        );
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_user_level
    AFTER INSERT ON xp_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();
  `);

  // Create trigger to update streak on daily login
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_login_streak()
    RETURNS TRIGGER AS $$
    DECLARE
      last_login DATE;
      current_streak INTEGER;
      streak_record RECORD;
    BEGIN
      -- Get current streak data
      SELECT login_streak, last_login_date INTO current_streak, last_login
      FROM user_streaks
      WHERE user_id = NEW.id;

      -- If this is the first login today
      IF last_login IS NULL OR last_login::DATE < CURRENT_DATE THEN
        -- Check if login was yesterday (streak continues)
        IF last_login IS NOT NULL AND last_login::DATE = CURRENT_DATE - INTERVAL '1 day' THEN
          -- Continue streak
          UPDATE user_streaks
          SET
            login_streak = login_streak + 1,
            longest_login_streak = GREATEST(longest_login_streak, login_streak + 1),
            last_login_date = NEW.last_login_at,
            updated_at = NOW()
          WHERE user_id = NEW.id;

          -- Record streak increase
          INSERT INTO streak_history (user_id, streak_type, streak_count, action)
          VALUES (NEW.id, 'login', current_streak + 1, 'increased');

          -- Check for milestone
          IF (current_streak + 1) IN (7, 14, 30, 60, 100, 365) THEN
            INSERT INTO streak_history (user_id, streak_type, streak_count, action, is_milestone, milestone_level)
            VALUES (NEW.id, 'login', current_streak + 1, 'increased', true, current_streak + 1);
          END IF;

        ELSIF last_login IS NOT NULL AND last_login::DATE < CURRENT_DATE - INTERVAL '1 day' THEN
          -- Streak broken
          INSERT INTO streak_history (user_id, streak_type, streak_count, action)
          VALUES (NEW.id, 'login', current_streak, 'broken');

          -- Reset streak
          UPDATE user_streaks
          SET
            login_streak = 1,
            last_login_date = NEW.last_login_at,
            streak_started_at = NEW.last_login_at,
            updated_at = NOW()
          WHERE user_id = NEW.id;
        ELSE
          -- First login ever or starting new streak
          UPDATE user_streaks
          SET
            login_streak = 1,
            longest_login_streak = GREATEST(longest_login_streak, 1),
            last_login_date = NEW.last_login_at,
            streak_started_at = NEW.last_login_at,
            updated_at = NOW()
          WHERE user_id = NEW.id;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_login_streak
    AFTER UPDATE OF last_login_at ON users
    FOR EACH ROW
    WHEN (OLD.last_login_at IS DISTINCT FROM NEW.last_login_at)
    EXECUTE FUNCTION update_login_streak();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_login_streak ON users');
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_user_level ON xp_transactions');

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS update_login_streak');
  await knex.raw('DROP FUNCTION IF EXISTS update_user_level');
  await knex.raw('DROP FUNCTION IF EXISTS calculate_level_from_xp');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('reward_history');
  await knex.schema.dropTableIfExists('user_challenge_progress');
  await knex.schema.dropTableIfExists('weekly_challenges');
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievements');
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('badges');
  await knex.schema.dropTableIfExists('daily_rewards');
  await knex.schema.dropTableIfExists('streak_history');
  await knex.schema.dropTableIfExists('user_streaks');
  await knex.schema.dropTableIfExists('xp_transactions');
  await knex.schema.dropTableIfExists('user_xp');
}
