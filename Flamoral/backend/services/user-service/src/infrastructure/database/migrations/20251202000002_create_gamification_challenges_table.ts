import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Challenge definitions table
  await knex.schema.createTable('challenge_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique().comment('Unique identifier for challenge');
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.enum('type', ['daily', 'weekly', 'monthly', 'special_event', 'limited_time']).notNullable();
    table.enum('category', ['social', 'activity', 'engagement', 'profile', 'premium']).notNullable();
    table.enum('difficulty', ['easy', 'medium', 'hard', 'expert']).defaultTo('easy');
    table.jsonb('requirements').notNullable().comment('Challenge requirements and goals');
    table.integer('target_value').notNullable().comment('Goal to complete challenge');
    table.integer('coin_reward').defaultTo(0);
    table.integer('xp_reward').defaultTo(0);
    table.integer('boost_reward').defaultTo(0);
    table.integer('super_like_reward').defaultTo(0);
    table.jsonb('bonus_rewards').comment('Additional rewards');
    table.string('icon_name').notNullable();
    table.string('badge_color');
    table.date('start_date').comment('When challenge becomes available');
    table.date('end_date').comment('When challenge expires');
    table.integer('duration_days').comment('How many days to complete');
    table.boolean('is_repeatable').defaultTo(false);
    table.boolean('is_featured').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('type');
    table.index('category');
    table.index('is_active');
    table.index(['start_date', 'end_date']);
  });

  // User challenges table
  await knex.schema.createTable('user_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('challenge_id').notNullable().references('id').inTable('challenge_definitions').onDelete('CASCADE');
    table.enum('status', ['not_started', 'in_progress', 'completed', 'failed', 'expired']).defaultTo('not_started');
    table.integer('progress').defaultTo(0).comment('Current progress toward goal');
    table.integer('target').notNullable().comment('Target value to complete');
    table.float('progress_percentage').defaultTo(0);
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('expires_at').comment('When challenge expires');
    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('reward_claimed_at');
    table.jsonb('progress_data').comment('Detailed progress information');
    table.integer('times_completed').defaultTo(0).comment('For repeatable challenges');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('challenge_id');
    table.index('status');
    table.index(['user_id', 'status']);
    table.index('expires_at');
    table.unique(['user_id', 'challenge_id']);
  });

  // Challenge progress tracking
  await knex.schema.createTable('challenge_progress_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('challenge_id').notNullable().references('id').inTable('challenge_definitions').onDelete('CASCADE');
    table.uuid('user_challenge_id').notNullable().references('id').inTable('user_challenges').onDelete('CASCADE');
    table.string('action_type').notNullable().comment('Action that triggered progress');
    table.integer('progress_increment').defaultTo(1);
    table.integer('progress_after').notNullable();
    table.jsonb('metadata').comment('Additional context');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('challenge_id');
    table.index('user_challenge_id');
    table.index('created_at');
  });

  // Insert default challenges
  await knex('challenge_definitions').insert([
    // Daily Challenges
    {
      key: 'DAILY_SWIPE_20',
      title: 'Daily Explorer',
      description: 'Swipe on 20 profiles today',
      type: 'daily',
      category: 'activity',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'swipe', count: 20 }),
      target_value: 20,
      coin_reward: 15,
      xp_reward: 100,
      icon_name: 'zap',
      badge_color: '#FFA500',
      duration_days: 1,
      is_repeatable: true,
    },
    {
      key: 'DAILY_MESSAGE_5',
      title: 'Daily Conversationalist',
      description: 'Send 5 messages today',
      type: 'daily',
      category: 'engagement',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'message', count: 5 }),
      target_value: 5,
      coin_reward: 10,
      xp_reward: 75,
      icon_name: 'message-circle',
      badge_color: '#4169E1',
      duration_days: 1,
      is_repeatable: true,
    },
    {
      key: 'DAILY_PROFILE_UPDATE',
      title: 'Profile Polish',
      description: 'Update your profile or add a new photo',
      type: 'daily',
      category: 'profile',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'profile_update', count: 1 }),
      target_value: 1,
      coin_reward: 20,
      xp_reward: 50,
      icon_name: 'user-check',
      badge_color: '#32CD32',
      duration_days: 1,
      is_repeatable: true,
    },
    // Weekly Challenges
    {
      key: 'WEEKLY_MATCH_10',
      title: 'Weekly Connector',
      description: 'Get 10 new matches this week',
      type: 'weekly',
      category: 'social',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'match', count: 10 }),
      target_value: 10,
      coin_reward: 100,
      xp_reward: 500,
      super_like_reward: 2,
      icon_name: 'heart',
      badge_color: '#FF1493',
      duration_days: 7,
      is_repeatable: true,
    },
    {
      key: 'WEEKLY_CONVERSATION_50',
      title: 'Weekly Chatter',
      description: 'Send 50 messages this week',
      type: 'weekly',
      category: 'engagement',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'message', count: 50 }),
      target_value: 50,
      coin_reward: 75,
      xp_reward: 400,
      super_like_reward: 1,
      icon_name: 'message-square',
      badge_color: '#1E90FF',
      duration_days: 7,
      is_repeatable: true,
    },
    {
      key: 'WEEKLY_SWIPE_100',
      title: 'Weekly Explorer',
      description: 'Swipe on 100 profiles this week',
      type: 'weekly',
      category: 'activity',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'swipe', count: 100 }),
      target_value: 100,
      coin_reward: 50,
      xp_reward: 300,
      boost_reward: 1,
      icon_name: 'zap',
      badge_color: '#FFD700',
      duration_days: 7,
      is_repeatable: true,
    },
    {
      key: 'WEEKLY_LOGIN_7',
      title: 'Perfect Week',
      description: 'Log in every day this week',
      type: 'weekly',
      category: 'activity',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'login', count: 7 }),
      target_value: 7,
      coin_reward: 150,
      xp_reward: 600,
      super_like_reward: 3,
      icon_name: 'calendar-check',
      badge_color: '#9400D3',
      duration_days: 7,
      is_repeatable: true,
    },
    // Monthly Challenges
    {
      key: 'MONTHLY_MATCH_50',
      title: 'Monthly Matchmaker',
      description: 'Get 50 new matches this month',
      type: 'monthly',
      category: 'social',
      difficulty: 'hard',
      requirements: JSON.stringify({ action: 'match', count: 50 }),
      target_value: 50,
      coin_reward: 500,
      xp_reward: 2000,
      boost_reward: 3,
      super_like_reward: 10,
      icon_name: 'award',
      badge_color: '#FFD700',
      duration_days: 30,
      is_repeatable: true,
    },
    {
      key: 'MONTHLY_CONVERSATION_200',
      title: 'Monthly Social Star',
      description: 'Send 200 messages this month',
      type: 'monthly',
      category: 'engagement',
      difficulty: 'hard',
      requirements: JSON.stringify({ action: 'message', count: 200 }),
      target_value: 200,
      coin_reward: 400,
      xp_reward: 1800,
      boost_reward: 2,
      super_like_reward: 8,
      icon_name: 'star',
      badge_color: '#FF6347',
      duration_days: 30,
      is_repeatable: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('challenge_progress_logs');
  await knex.schema.dropTableIfExists('user_challenges');
  await knex.schema.dropTableIfExists('challenge_definitions');
}
