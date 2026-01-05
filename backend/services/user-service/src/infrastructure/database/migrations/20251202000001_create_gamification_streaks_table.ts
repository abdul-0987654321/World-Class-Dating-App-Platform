import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User activity streaks table (login, conversation, match)
  await knex.schema.createTable('user_streaks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('streak_type', ['login', 'conversation', 'match', 'activity']).notNullable();
    table.integer('current_streak').defaultTo(0).comment('Current consecutive days');
    table.integer('longest_streak').defaultTo(0).comment('Longest streak achieved');
    table.timestamp('streak_start_date').comment('When current streak started');
    table.timestamp('last_activity_date').comment('Last day activity was recorded');
    table.boolean('is_protected').defaultTo(false).comment('Streak freeze/protection active');
    table.integer('protection_count').defaultTo(0).comment('Number of protections used');
    table.timestamp('protection_expires_at').comment('When streak protection expires');
    table.jsonb('streak_history').defaultTo('[]').comment('History of streak milestones');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'streak_type']);
    table.index('current_streak');
    table.unique(['user_id', 'streak_type']);
  });

  // Streak milestones/rewards table
  await knex.schema.createTable('streak_milestones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('streak_type', ['login', 'conversation', 'match', 'activity']).notNullable();
    table.integer('days_required').notNullable().comment('Days needed to reach milestone');
    table.string('title').notNullable();
    table.text('description');
    table.integer('coin_reward').defaultTo(0);
    table.integer('boost_reward').defaultTo(0);
    table.integer('super_like_reward').defaultTo(0);
    table.jsonb('bonus_rewards').comment('Additional rewards (badges, etc.)');
    table.string('badge_icon');
    table.string('badge_color');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['streak_type', 'days_required']);
    table.unique(['streak_type', 'days_required']);
  });

  // User streak milestone achievements
  await knex.schema.createTable('user_streak_milestones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('milestone_id')
      .notNullable()
      .references('id')
      .inTable('streak_milestones')
      .onDelete('CASCADE');
    table
      .uuid('streak_id')
      .notNullable()
      .references('id')
      .inTable('user_streaks')
      .onDelete('CASCADE');
    table
      .integer('streak_at_achievement')
      .notNullable()
      .comment('Streak count when milestone was reached');
    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('achieved_at').defaultTo(knex.fn.now());
    table.timestamp('claimed_at');

    // Indexes
    table.index('user_id');
    table.index('milestone_id');
    table.index(['user_id', 'reward_claimed']);
    table.unique(['user_id', 'milestone_id']);
  });

  // Insert default streak milestones
  await knex('streak_milestones').insert([
    // Login streak milestones
    {
      streak_type: 'login',
      days_required: 3,
      title: '3-Day Login Streak',
      description: 'Log in for 3 consecutive days',
      coin_reward: 20,
      badge_icon: 'fire',
      badge_color: '#FFA500',
    },
    {
      streak_type: 'login',
      days_required: 7,
      title: 'Week Warrior',
      description: 'Log in for 7 consecutive days',
      coin_reward: 50,
      super_like_reward: 1,
      badge_icon: 'fire',
      badge_color: '#FF6347',
    },
    {
      streak_type: 'login',
      days_required: 14,
      title: 'Two Week Champion',
      description: 'Log in for 14 consecutive days',
      coin_reward: 100,
      super_like_reward: 2,
      badge_icon: 'fire',
      badge_color: '#FF4500',
    },
    {
      streak_type: 'login',
      days_required: 30,
      title: 'Monthly Master',
      description: 'Log in for 30 consecutive days',
      coin_reward: 250,
      boost_reward: 1,
      super_like_reward: 5,
      badge_icon: 'trophy',
      badge_color: '#FFD700',
    },
    {
      streak_type: 'login',
      days_required: 100,
      title: 'Century Club',
      description: 'Log in for 100 consecutive days',
      coin_reward: 1000,
      boost_reward: 3,
      super_like_reward: 10,
      badge_icon: 'crown',
      badge_color: '#9400D3',
    },
    // Conversation streak milestones
    {
      streak_type: 'conversation',
      days_required: 3,
      title: 'Conversation Starter',
      description: 'Send messages for 3 consecutive days',
      coin_reward: 15,
      badge_icon: 'message-circle',
      badge_color: '#4169E1',
    },
    {
      streak_type: 'conversation',
      days_required: 7,
      title: 'Social Butterfly',
      description: 'Send messages for 7 consecutive days',
      coin_reward: 40,
      super_like_reward: 1,
      badge_icon: 'message-square',
      badge_color: '#1E90FF',
    },
    {
      streak_type: 'conversation',
      days_required: 14,
      title: 'Engagement Expert',
      description: 'Send messages for 14 consecutive days',
      coin_reward: 80,
      super_like_reward: 2,
      badge_icon: 'users',
      badge_color: '#00BFFF',
    },
    {
      streak_type: 'conversation',
      days_required: 30,
      title: 'Master Communicator',
      description: 'Send messages for 30 consecutive days',
      coin_reward: 200,
      boost_reward: 1,
      super_like_reward: 5,
      badge_icon: 'award',
      badge_color: '#FFD700',
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_streak_milestones');
  await knex.schema.dropTableIfExists('streak_milestones');
  await knex.schema.dropTableIfExists('user_streaks');
}
