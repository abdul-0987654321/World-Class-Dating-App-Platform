import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Daily login rewards table
  await knex.schema.createTable('daily_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('streak_count').defaultTo(0).comment('Current consecutive login streak');
    table.integer('total_logins').defaultTo(0).comment('Total number of logins');
    table.integer('longest_streak').defaultTo(0).comment('Longest streak achieved');
    table.timestamp('last_claim_date').comment('Last time user claimed daily reward');
    table.timestamp('current_streak_start').comment('When current streak started');
    table.integer('day_in_cycle').defaultTo(1).comment('Current day in 7-day reward cycle (1-7)');
    table.boolean('can_claim_today').defaultTo(true).comment('Whether user can claim today');
    table.jsonb('rewards_history').defaultTo('[]').comment('History of claimed rewards');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('last_claim_date');
    table.index('streak_count');
  });

  // Daily reward claims table (track each claim)
  await knex.schema.createTable('daily_reward_claims', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('day_number').notNullable().comment('Day in cycle (1-7)');
    table.integer('streak_at_claim').notNullable().comment('Streak count when claimed');
    table.enum('reward_type', ['coins', 'super_likes', 'boosts', 'premium_trial']).notNullable();
    table.integer('reward_amount').notNullable();
    table.jsonb('reward_details').comment('Additional reward information');
    table.timestamp('claimed_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('claimed_at');
    table.index(['user_id', 'claimed_at']);
  });

  // Reward calendar configuration table
  await knex.schema.createTable('reward_calendar_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('day_number').notNullable().unique().comment('Day in cycle (1-7)');
    table.enum('reward_type', ['coins', 'super_likes', 'boosts', 'premium_trial']).notNullable();
    table.integer('base_amount').notNullable().comment('Base reward amount');
    table.integer('streak_multiplier').defaultTo(1).comment('Multiplier for streak bonus');
    table.jsonb('bonus_conditions').comment('Conditions for bonus rewards');
    table.boolean('is_special_day').defaultTo(false).comment('Whether this is a special bonus day');
    table.text('description');
    table.string('icon_name');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Insert default 7-day reward calendar
  await knex('reward_calendar_config').insert([
    {
      day_number: 1,
      reward_type: 'coins',
      base_amount: 10,
      streak_multiplier: 1,
      description: 'Start your week with coins!',
      icon_name: 'coin',
      is_special_day: false,
    },
    {
      day_number: 2,
      reward_type: 'coins',
      base_amount: 15,
      streak_multiplier: 1,
      description: 'Keep the streak going!',
      icon_name: 'coin',
      is_special_day: false,
    },
    {
      day_number: 3,
      reward_type: 'super_likes',
      base_amount: 2,
      streak_multiplier: 1,
      description: 'Super Likes to stand out!',
      icon_name: 'star',
      is_special_day: false,
    },
    {
      day_number: 4,
      reward_type: 'coins',
      base_amount: 20,
      streak_multiplier: 1,
      description: 'Halfway bonus!',
      icon_name: 'coin',
      is_special_day: false,
    },
    {
      day_number: 5,
      reward_type: 'super_likes',
      base_amount: 3,
      streak_multiplier: 1,
      description: 'More Super Likes!',
      icon_name: 'star',
      is_special_day: false,
    },
    {
      day_number: 6,
      reward_type: 'boosts',
      base_amount: 1,
      streak_multiplier: 1,
      description: 'Get boosted!',
      icon_name: 'rocket',
      is_special_day: false,
    },
    {
      day_number: 7,
      reward_type: 'coins',
      base_amount: 50,
      streak_multiplier: 2,
      description: 'Week complete! Big bonus!',
      icon_name: 'trophy',
      is_special_day: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reward_calendar_config');
  await knex.schema.dropTableIfExists('daily_reward_claims');
  await knex.schema.dropTableIfExists('daily_rewards');
}
