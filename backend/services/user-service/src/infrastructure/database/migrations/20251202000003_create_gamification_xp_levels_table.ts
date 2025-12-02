import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User XP and levels table
  await knex.schema.createTable('user_experience', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_xp').defaultTo(0).comment('Total experience points earned');
    table.integer('current_level').defaultTo(1).comment('Current user level');
    table.integer('current_level_xp').defaultTo(0).comment('XP progress in current level');
    table.integer('xp_to_next_level').defaultTo(100).comment('XP needed for next level');
    table.float('level_progress_percentage').defaultTo(0);
    table.timestamp('last_xp_earned_at').comment('Last time XP was earned');
    table.timestamp('last_level_up_at').comment('Last time user leveled up');
    table.jsonb('level_history').defaultTo('[]').comment('History of level ups');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('current_level');
    table.index('total_xp');
  });

  // XP transactions log
  await knex.schema.createTable('xp_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('amount').notNullable().comment('XP amount (positive or negative)');
    table.enum('type', ['earned', 'bonus', 'deducted', 'penalty']).notNullable();
    table.string('source').notNullable().comment('Where XP came from (swipe, message, achievement, etc.)');
    table.text('description');
    table.jsonb('metadata').comment('Additional context');
    table.integer('level_before').notNullable();
    table.integer('level_after').notNullable();
    table.integer('total_xp_after').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('type');
    table.index('source');
    table.index('created_at');
  });

  // Level definitions and rewards
  await knex.schema.createTable('level_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('level').notNullable().unique().comment('Level number');
    table.string('title').notNullable().comment('Level title/name');
    table.text('description');
    table.integer('xp_required').notNullable().comment('Total XP needed to reach this level');
    table.integer('xp_for_this_level').notNullable().comment('XP needed within this level');
    table.integer('coin_reward').defaultTo(0);
    table.integer('boost_reward').defaultTo(0);
    table.integer('super_like_reward').defaultTo(0);
    table.jsonb('unlocks').comment('Features/perks unlocked at this level');
    table.string('badge_icon');
    table.string('badge_color');
    table.string('tier').comment('bronze, silver, gold, platinum, diamond');
    table.boolean('is_milestone').defaultTo(false).comment('Special milestone level');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('level');
    table.index('xp_required');
  });

  // XP sources and rates
  await knex.schema.createTable('xp_sources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('action_key').notNullable().unique().comment('Unique identifier for action');
    table.string('action_name').notNullable();
    table.text('description');
    table.enum('category', ['profile', 'social', 'activity', 'engagement', 'premium']).notNullable();
    table.integer('base_xp').notNullable().comment('Base XP awarded');
    table.integer('max_daily_count').comment('Max times per day this can award XP (null = unlimited)');
    table.integer('cooldown_minutes').comment('Minutes before can earn XP again from this action');
    table.boolean('is_repeatable').defaultTo(true);
    table.float('multiplier').defaultTo(1.0).comment('XP multiplier');
    table.jsonb('bonus_conditions').comment('Conditions for bonus XP');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('action_key');
    table.index('category');
    table.index('is_active');
  });

  // User level achievements/unlocks
  await knex.schema.createTable('user_level_unlocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('level_id').notNullable().references('id').inTable('level_definitions').onDelete('CASCADE');
    table.integer('level').notNullable();
    table.boolean('reward_claimed').defaultTo(false);
    table.timestamp('unlocked_at').defaultTo(knex.fn.now());
    table.timestamp('claimed_at');

    // Indexes
    table.index('user_id');
    table.index('level_id');
    table.index(['user_id', 'level']);
    table.unique(['user_id', 'level_id']);
  });

  // Insert default level definitions (1-50)
  const levels = [];
  let totalXpRequired = 0;

  for (let level = 1; level <= 50; level++) {
    // XP formula: exponential growth with diminishing returns
    // Level 1: 100 XP, Level 10: ~1500 XP, Level 20: ~4500 XP, Level 50: ~25000 XP
    const xpForLevel = Math.floor(100 * Math.pow(level, 1.5));
    totalXpRequired += level > 1 ? xpForLevel : 0;

    let tier = 'bronze';
    let coinReward = 10 * level;
    let boostReward = 0;
    let superLikeReward = 0;
    let isMilestone = false;

    if (level >= 40) {
      tier = 'diamond';
      coinReward = 50 * level;
      boostReward = Math.floor(level / 10);
      superLikeReward = Math.floor(level / 5);
    } else if (level >= 30) {
      tier = 'platinum';
      coinReward = 40 * level;
      boostReward = Math.floor(level / 15);
      superLikeReward = Math.floor(level / 10);
    } else if (level >= 20) {
      tier = 'gold';
      coinReward = 30 * level;
      superLikeReward = Math.floor(level / 10);
    } else if (level >= 10) {
      tier = 'silver';
      coinReward = 20 * level;
    }

    // Milestone levels
    if ([5, 10, 15, 20, 25, 30, 40, 50].includes(level)) {
      isMilestone = true;
      coinReward *= 2;
      boostReward += 1;
      superLikeReward += 2;
    }

    levels.push({
      level,
      title: getTitleForLevel(level),
      description: `Reach level ${level}`,
      xp_required: totalXpRequired,
      xp_for_this_level: xpForLevel,
      coin_reward: coinReward,
      boost_reward: boostReward,
      super_like_reward: superLikeReward,
      unlocks: JSON.stringify(getUnlocksForLevel(level)),
      badge_icon: getIconForLevel(level),
      badge_color: getColorForTier(tier),
      tier,
      is_milestone: isMilestone,
    });
  }

  await knex('level_definitions').insert(levels);

  // Insert default XP sources
  await knex('xp_sources').insert([
    // Profile actions
    {
      action_key: 'PROFILE_COMPLETE',
      action_name: 'Complete Profile',
      description: 'Complete your profile to 100%',
      category: 'profile',
      base_xp: 500,
      is_repeatable: false,
    },
    {
      action_key: 'PHOTO_UPLOAD',
      action_name: 'Upload Photo',
      description: 'Add a photo to your profile',
      category: 'profile',
      base_xp: 50,
      max_daily_count: 6,
      is_repeatable: true,
    },
    {
      action_key: 'PROFILE_UPDATE',
      action_name: 'Update Profile',
      description: 'Update your profile information',
      category: 'profile',
      base_xp: 25,
      max_daily_count: 5,
      cooldown_minutes: 60,
      is_repeatable: true,
    },
    {
      action_key: 'VERIFY_PHONE',
      action_name: 'Verify Phone Number',
      description: 'Verify your phone number',
      category: 'profile',
      base_xp: 200,
      is_repeatable: false,
    },
    {
      action_key: 'VERIFY_PHOTO',
      action_name: 'Verify Photo',
      description: 'Complete photo verification',
      category: 'profile',
      base_xp: 300,
      is_repeatable: false,
    },
    // Social actions
    {
      action_key: 'MATCH',
      action_name: 'New Match',
      description: 'Get a new match',
      category: 'social',
      base_xp: 100,
      is_repeatable: true,
    },
    {
      action_key: 'SUPER_LIKE_MATCH',
      action_name: 'Super Like Match',
      description: 'Match with someone you super liked',
      category: 'social',
      base_xp: 200,
      is_repeatable: true,
    },
    {
      action_key: 'MUTUAL_SUPER_LIKE',
      action_name: 'Mutual Super Like',
      description: 'Both users super liked each other',
      category: 'social',
      base_xp: 300,
      is_repeatable: true,
    },
    // Activity actions
    {
      action_key: 'SWIPE',
      action_name: 'Swipe',
      description: 'Swipe on a profile',
      category: 'activity',
      base_xp: 1,
      is_repeatable: true,
    },
    {
      action_key: 'SUPER_LIKE',
      action_name: 'Use Super Like',
      description: 'Send a super like',
      category: 'activity',
      base_xp: 10,
      is_repeatable: true,
    },
    {
      action_key: 'DAILY_LOGIN',
      action_name: 'Daily Login',
      description: 'Log in to the app',
      category: 'activity',
      base_xp: 50,
      max_daily_count: 1,
      is_repeatable: true,
    },
    // Engagement actions
    {
      action_key: 'SEND_MESSAGE',
      action_name: 'Send Message',
      description: 'Send a message to a match',
      category: 'engagement',
      base_xp: 10,
      is_repeatable: true,
    },
    {
      action_key: 'FIRST_MESSAGE',
      action_name: 'Start Conversation',
      description: 'Send the first message to a match',
      category: 'engagement',
      base_xp: 50,
      is_repeatable: true,
    },
    {
      action_key: 'QUICK_RESPONSE',
      action_name: 'Quick Response',
      description: 'Respond within 60 seconds',
      category: 'engagement',
      base_xp: 25,
      cooldown_minutes: 5,
      is_repeatable: true,
    },
    {
      action_key: 'VIDEO_CHAT',
      action_name: 'Video Chat',
      description: 'Start a video chat',
      category: 'engagement',
      base_xp: 150,
      is_repeatable: true,
    },
    // Premium actions
    {
      action_key: 'SUBSCRIBE',
      action_name: 'Subscribe to Premium',
      description: 'Subscribe to a premium plan',
      category: 'premium',
      base_xp: 1000,
      is_repeatable: false,
    },
    {
      action_key: 'REFER_FRIEND',
      action_name: 'Refer a Friend',
      description: 'Refer a friend who signs up',
      category: 'premium',
      base_xp: 500,
      is_repeatable: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_level_unlocks');
  await knex.schema.dropTableIfExists('xp_sources');
  await knex.schema.dropTableIfExists('level_definitions');
  await knex.schema.dropTableIfExists('xp_transactions');
  await knex.schema.dropTableIfExists('user_experience');
}

// Helper functions for level generation
function getTitleForLevel(level: number): string {
  if (level === 1) return 'Newcomer';
  if (level < 5) return 'Explorer';
  if (level < 10) return 'Active Member';
  if (level < 15) return 'Regular';
  if (level < 20) return 'Experienced';
  if (level < 25) return 'Veteran';
  if (level < 30) return 'Expert';
  if (level < 35) return 'Master';
  if (level < 40) return 'Elite';
  if (level < 45) return 'Legend';
  return 'Mythic';
}

function getUnlocksForLevel(level: number): any {
  const unlocks = [];

  if (level === 5) unlocks.push({ type: 'feature', name: 'Advanced Filters' });
  if (level === 10) unlocks.push({ type: 'feature', name: 'See Who Liked You Preview' });
  if (level === 15) unlocks.push({ type: 'feature', name: 'Rewind Feature (1 per day)' });
  if (level === 20) unlocks.push({ type: 'feature', name: 'Unlimited Likes for 24h' });
  if (level === 25) unlocks.push({ type: 'badge', name: 'Veteran Badge' });
  if (level === 30) unlocks.push({ type: 'feature', name: 'Priority Customer Support' });
  if (level === 40) unlocks.push({ type: 'badge', name: 'Elite Member Badge' });
  if (level === 50) unlocks.push({ type: 'badge', name: 'Legendary Member Badge' });

  return unlocks;
}

function getIconForLevel(level: number): string {
  if (level < 10) return 'star';
  if (level < 20) return 'trending-up';
  if (level < 30) return 'award';
  if (level < 40) return 'trophy';
  return 'crown';
}

function getColorForTier(tier: string): string {
  const colors: { [key: string]: string } = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier] || '#CD7F32';
}
