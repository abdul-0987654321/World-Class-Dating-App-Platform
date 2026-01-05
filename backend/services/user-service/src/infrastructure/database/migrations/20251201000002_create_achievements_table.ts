import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Achievement definitions table
  await knex.schema.createTable('achievement_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique().comment('Unique identifier for achievement');
    table.string('name').notNullable();
    table.text('description').notNullable();
    table
      .enum('category', [
        'profile',
        'social',
        'activity',
        'premium',
        'milestone',
        'special',
        'hidden',
      ])
      .notNullable();
    table.enum('tier', ['bronze', 'silver', 'gold', 'platinum', 'diamond']).defaultTo('bronze');
    table.integer('points').defaultTo(0).comment('Points awarded for achievement');
    table.integer('coin_reward').defaultTo(0).comment('Coins awarded for achievement');
    table.jsonb('requirements').comment('Requirements to unlock achievement');
    table.integer('target_value').comment('Target value for progress-based achievements');
    table.string('icon_name').notNullable();
    table.string('badge_color');
    table.boolean('is_hidden').defaultTo(false).comment('Hidden until unlocked');
    table.boolean('is_secret').defaultTo(false).comment('Secret achievement');
    table.boolean('is_repeatable').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('category');
    table.index('tier');
    table.index('is_active');
  });

  // User achievements table
  await knex.schema.createTable('user_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('achievement_definitions')
      .onDelete('CASCADE');
    table.integer('progress').defaultTo(0).comment('Current progress toward achievement');
    table.integer('target').comment('Target value needed');
    table.float('progress_percentage').defaultTo(0);
    table.boolean('is_unlocked').defaultTo(false);
    table.timestamp('unlocked_at').comment('When achievement was unlocked');
    table.boolean('is_showcased').defaultTo(false).comment('Shown on profile');
    table.integer('showcase_order').comment('Order in showcase');
    table.boolean('notification_sent').defaultTo(false);
    table.integer('times_completed').defaultTo(0).comment('For repeatable achievements');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('achievement_id');
    table.index(['user_id', 'is_unlocked']);
    table.index(['user_id', 'is_showcased']);
    table.unique(['user_id', 'achievement_id']);
  });

  // Achievement progress tracking table
  await knex.schema.createTable('achievement_progress_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('achievement_definitions')
      .onDelete('CASCADE');
    table.string('action_type').notNullable().comment('Type of action that triggered progress');
    table.integer('progress_increment').defaultTo(1);
    table.integer('progress_after').notNullable();
    table.jsonb('metadata').comment('Additional context about the progress');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('achievement_id');
    table.index('created_at');
  });

  // User achievement stats table
  await knex.schema.createTable('user_achievement_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.integer('total_achievements').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.integer('bronze_count').defaultTo(0);
    table.integer('silver_count').defaultTo(0);
    table.integer('gold_count').defaultTo(0);
    table.integer('platinum_count').defaultTo(0);
    table.integer('diamond_count').defaultTo(0);
    table.integer('hidden_unlocked').defaultTo(0);
    table.integer('secret_unlocked').defaultTo(0);
    table.float('completion_percentage').defaultTo(0);
    table.timestamp('last_achievement_at').comment('Last achievement unlock time');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('total_points');
    table.index('completion_percentage');
  });

  // Insert default achievements
  await knex('achievement_definitions').insert([
    // Profile Achievements
    {
      key: 'PROFILE_COMPLETE',
      name: 'Profile Perfectionist',
      description: 'Complete your profile with all required information',
      category: 'profile',
      tier: 'bronze',
      points: 50,
      coin_reward: 20,
      target_value: 100,
      icon_name: 'user-check',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 1,
    },
    {
      key: 'PHOTOS_UPLOADED_3',
      name: 'Picture Perfect',
      description: 'Upload at least 3 photos to your profile',
      category: 'profile',
      tier: 'bronze',
      points: 30,
      coin_reward: 10,
      target_value: 3,
      icon_name: 'camera',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 2,
    },
    {
      key: 'PHOTOS_UPLOADED_6',
      name: 'Photo Gallery Master',
      description: 'Upload 6 or more photos to your profile',
      category: 'profile',
      tier: 'silver',
      points: 50,
      coin_reward: 25,
      target_value: 6,
      icon_name: 'images',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 3,
    },
    {
      key: 'PHONE_VERIFIED',
      name: 'Verified User',
      description: 'Verify your phone number',
      category: 'profile',
      tier: 'bronze',
      points: 40,
      coin_reward: 15,
      target_value: 1,
      icon_name: 'shield-check',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 4,
    },
    {
      key: 'PHOTO_VERIFIED',
      name: 'Authentically You',
      description: 'Complete photo verification',
      category: 'profile',
      tier: 'gold',
      points: 100,
      coin_reward: 50,
      target_value: 1,
      icon_name: 'badge-check',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 5,
    },

    // Social Achievements
    {
      key: 'FIRST_MATCH',
      name: 'First Connection',
      description: 'Get your first match',
      category: 'social',
      tier: 'bronze',
      points: 50,
      coin_reward: 20,
      target_value: 1,
      icon_name: 'heart',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 10,
    },
    {
      key: 'MATCHES_10',
      name: 'Popular',
      description: 'Get 10 matches',
      category: 'social',
      tier: 'silver',
      points: 100,
      coin_reward: 40,
      target_value: 10,
      icon_name: 'users',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 11,
    },
    {
      key: 'MATCHES_50',
      name: 'Social Butterfly',
      description: 'Get 50 matches',
      category: 'social',
      tier: 'gold',
      points: 250,
      coin_reward: 100,
      target_value: 50,
      icon_name: 'users',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 12,
    },
    {
      key: 'MATCHES_100',
      name: 'Connection Master',
      description: 'Get 100 matches',
      category: 'social',
      tier: 'platinum',
      points: 500,
      coin_reward: 200,
      target_value: 100,
      icon_name: 'award',
      badge_color: '#E5E4E2',
      is_hidden: false,
      display_order: 13,
    },
    {
      key: 'FIRST_MESSAGE',
      name: 'Ice Breaker',
      description: 'Send your first message',
      category: 'social',
      tier: 'bronze',
      points: 30,
      coin_reward: 10,
      target_value: 1,
      icon_name: 'message-circle',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 14,
    },
    {
      key: 'MESSAGES_100',
      name: 'Conversationalist',
      description: 'Send 100 messages',
      category: 'social',
      tier: 'silver',
      points: 100,
      coin_reward: 50,
      target_value: 100,
      icon_name: 'message-square',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 15,
    },
    {
      key: 'MESSAGES_500',
      name: 'Social Expert',
      description: 'Send 500 messages',
      category: 'social',
      tier: 'gold',
      points: 300,
      coin_reward: 150,
      target_value: 500,
      icon_name: 'message-square',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 16,
    },

    // Activity Achievements
    {
      key: 'SWIPES_100',
      name: 'Active Swiper',
      description: 'Swipe on 100 profiles',
      category: 'activity',
      tier: 'bronze',
      points: 50,
      coin_reward: 20,
      target_value: 100,
      icon_name: 'zap',
      badge_color: '#CD7F32',
      is_hidden: false,
      display_order: 20,
    },
    {
      key: 'SWIPES_500',
      name: 'Swipe Enthusiast',
      description: 'Swipe on 500 profiles',
      category: 'activity',
      tier: 'silver',
      points: 150,
      coin_reward: 75,
      target_value: 500,
      icon_name: 'zap',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 21,
    },
    {
      key: 'SWIPES_1000',
      name: 'Swipe Master',
      description: 'Swipe on 1000 profiles',
      category: 'activity',
      tier: 'gold',
      points: 300,
      coin_reward: 150,
      target_value: 1000,
      icon_name: 'zap',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 22,
    },
    {
      key: 'LOGIN_STREAK_7',
      name: 'Week Warrior',
      description: 'Login for 7 consecutive days',
      category: 'activity',
      tier: 'silver',
      points: 100,
      coin_reward: 50,
      target_value: 7,
      icon_name: 'calendar',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 23,
    },
    {
      key: 'LOGIN_STREAK_30',
      name: 'Dedicated Member',
      description: 'Login for 30 consecutive days',
      category: 'activity',
      tier: 'gold',
      points: 500,
      coin_reward: 250,
      target_value: 30,
      icon_name: 'calendar-check',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 24,
    },
    {
      key: 'LOGIN_STREAK_100',
      name: 'Century Club',
      description: 'Login for 100 consecutive days',
      category: 'activity',
      tier: 'diamond',
      points: 1000,
      coin_reward: 500,
      target_value: 100,
      icon_name: 'trophy',
      badge_color: '#B9F2FF',
      is_hidden: false,
      display_order: 25,
    },

    // Premium Achievements
    {
      key: 'FIRST_SUBSCRIPTION',
      name: 'Premium Member',
      description: 'Subscribe to premium for the first time',
      category: 'premium',
      tier: 'gold',
      points: 200,
      coin_reward: 100,
      target_value: 1,
      icon_name: 'crown',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 30,
    },
    {
      key: 'REFER_FRIEND',
      name: 'Wingman',
      description: 'Refer a friend who signs up',
      category: 'premium',
      tier: 'silver',
      points: 150,
      coin_reward: 100,
      target_value: 1,
      icon_name: 'user-plus',
      badge_color: '#C0C0C0',
      is_hidden: false,
      display_order: 31,
    },
    {
      key: 'REFER_FRIENDS_5',
      name: 'Ambassador',
      description: 'Refer 5 friends who sign up',
      category: 'premium',
      tier: 'gold',
      points: 500,
      coin_reward: 500,
      target_value: 5,
      icon_name: 'users',
      badge_color: '#FFD700',
      is_hidden: false,
      display_order: 32,
    },

    // Hidden/Secret Achievements
    {
      key: 'MIDNIGHT_SWIPER',
      name: 'Night Owl',
      description: 'Swipe after midnight',
      category: 'hidden',
      tier: 'bronze',
      points: 50,
      coin_reward: 25,
      target_value: 1,
      icon_name: 'moon',
      badge_color: '#4B0082',
      is_hidden: true,
      is_secret: true,
      display_order: 40,
    },
    {
      key: 'SUPER_LIKE_MATCH',
      name: 'Super Connection',
      description: 'Match with someone you super liked',
      category: 'hidden',
      tier: 'silver',
      points: 100,
      coin_reward: 50,
      target_value: 1,
      icon_name: 'star',
      badge_color: '#FF69B4',
      is_hidden: true,
      is_secret: true,
      display_order: 41,
    },
    {
      key: 'MUTUAL_SUPER_LIKE',
      name: 'Meant to Be',
      description: 'Match with someone who also super liked you',
      category: 'hidden',
      tier: 'gold',
      points: 200,
      coin_reward: 100,
      target_value: 1,
      icon_name: 'heart',
      badge_color: '#FF1493',
      is_hidden: true,
      is_secret: true,
      display_order: 42,
    },
    {
      key: 'QUICK_RESPONDER',
      name: 'Lightning Fast',
      description: 'Respond to a message within 60 seconds',
      category: 'hidden',
      tier: 'bronze',
      points: 50,
      coin_reward: 25,
      target_value: 1,
      icon_name: 'zap',
      badge_color: '#FFFF00',
      is_hidden: true,
      is_secret: true,
      display_order: 43,
    },
    {
      key: 'WEEKEND_WARRIOR',
      name: 'Weekend Warrior',
      description: 'Be active for 10 consecutive weekends',
      category: 'hidden',
      tier: 'gold',
      points: 250,
      coin_reward: 150,
      target_value: 10,
      icon_name: 'calendar',
      badge_color: '#FF6347',
      is_hidden: true,
      is_secret: true,
      display_order: 44,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_achievement_stats');
  await knex.schema.dropTableIfExists('achievement_progress_logs');
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievement_definitions');
}
