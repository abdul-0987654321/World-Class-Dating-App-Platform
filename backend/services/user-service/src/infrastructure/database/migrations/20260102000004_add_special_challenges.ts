import { Knex } from 'knex';

/**
 * Migration: Add Special Challenges
 * Adds the special challenge types as specified:
 * - Daily: "Send 5 messages today" - 50 coins
 * - Daily: "Complete your profile" - 100 coins
 * - Weekly: "Get 3 matches this week" - 200 coins
 * - Weekly: "Log in 5 days straight" - 150 coins
 * - Special: "Verify your photo" - 500 coins
 * - Special: "Refer a friend" - 1000 coins
 */
export async function up(knex: Knex): Promise<void> {
  // Check if challenges already exist to avoid duplicates
  const existingKeys = await knex('challenge_definitions')
    .select('key')
    .whereIn('key', [
      'DAILY_SEND_5_MESSAGES',
      'DAILY_COMPLETE_PROFILE',
      'WEEKLY_3_MATCHES',
      'WEEKLY_LOGIN_5_DAYS',
      'SPECIAL_VERIFY_PHOTO',
      'SPECIAL_REFER_FRIEND',
    ]);

  const existingKeySet = new Set(existingKeys.map((r) => r.key));

  const newChallenges = [];

  // Daily: Send 5 messages - 50 coins
  if (!existingKeySet.has('DAILY_SEND_5_MESSAGES')) {
    newChallenges.push({
      key: 'DAILY_SEND_5_MESSAGES',
      title: 'Chatterbox',
      description: 'Send 5 messages today',
      type: 'daily',
      category: 'engagement',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'message', count: 5 }),
      target_value: 5,
      coin_reward: 50,
      xp_reward: 100,
      boost_reward: 0,
      super_like_reward: 0,
      icon_name: 'message-circle',
      badge_color: '#4169E1',
      duration_days: 1,
      is_repeatable: true,
      is_featured: true,
      display_order: 1,
    });
  }

  // Daily: Complete your profile - 100 coins
  if (!existingKeySet.has('DAILY_COMPLETE_PROFILE')) {
    newChallenges.push({
      key: 'DAILY_COMPLETE_PROFILE',
      title: 'Profile Perfection',
      description: 'Complete your profile to 100%',
      type: 'daily',
      category: 'profile',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'profile_complete', count: 1 }),
      target_value: 1,
      coin_reward: 100,
      xp_reward: 200,
      boost_reward: 0,
      super_like_reward: 1,
      icon_name: 'user-check',
      badge_color: '#32CD32',
      duration_days: 1,
      is_repeatable: false,
      is_featured: true,
      display_order: 2,
    });
  }

  // Weekly: Get 3 matches - 200 coins
  if (!existingKeySet.has('WEEKLY_3_MATCHES')) {
    newChallenges.push({
      key: 'WEEKLY_3_MATCHES',
      title: 'Match Maker',
      description: 'Get 3 matches this week',
      type: 'weekly',
      category: 'social',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'match', count: 3 }),
      target_value: 3,
      coin_reward: 200,
      xp_reward: 350,
      boost_reward: 1,
      super_like_reward: 2,
      icon_name: 'heart',
      badge_color: '#FF1493',
      duration_days: 7,
      is_repeatable: true,
      is_featured: true,
      display_order: 10,
    });
  }

  // Weekly: Log in 5 days straight - 150 coins
  if (!existingKeySet.has('WEEKLY_LOGIN_5_DAYS')) {
    newChallenges.push({
      key: 'WEEKLY_LOGIN_5_DAYS',
      title: 'Dedicated Dater',
      description: 'Log in 5 days straight',
      type: 'weekly',
      category: 'activity',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'login', count: 5, consecutive: true }),
      target_value: 5,
      coin_reward: 150,
      xp_reward: 400,
      boost_reward: 0,
      super_like_reward: 2,
      icon_name: 'calendar-check',
      badge_color: '#9400D3',
      duration_days: 7,
      is_repeatable: true,
      is_featured: true,
      display_order: 11,
    });
  }

  // Special: Verify your photo - 500 coins
  if (!existingKeySet.has('SPECIAL_VERIFY_PHOTO')) {
    newChallenges.push({
      key: 'SPECIAL_VERIFY_PHOTO',
      title: 'Verified Star',
      description: 'Verify your photo to prove you are real',
      type: 'special_event',
      category: 'profile',
      difficulty: 'easy',
      requirements: JSON.stringify({ action: 'photo_verify', count: 1 }),
      target_value: 1,
      coin_reward: 500,
      xp_reward: 1000,
      boost_reward: 2,
      super_like_reward: 5,
      icon_name: 'shield-check',
      badge_color: '#00BFFF',
      duration_days: null,
      is_repeatable: false,
      is_featured: true,
      display_order: 100,
    });
  }

  // Special: Refer a friend - 1000 coins
  if (!existingKeySet.has('SPECIAL_REFER_FRIEND')) {
    newChallenges.push({
      key: 'SPECIAL_REFER_FRIEND',
      title: 'Social Butterfly',
      description: 'Refer a friend to FLAMORAL',
      type: 'special_event',
      category: 'social',
      difficulty: 'medium',
      requirements: JSON.stringify({ action: 'refer_friend', count: 1 }),
      target_value: 1,
      coin_reward: 1000,
      xp_reward: 2000,
      boost_reward: 3,
      super_like_reward: 10,
      icon_name: 'users-plus',
      badge_color: '#FFD700',
      duration_days: null,
      is_repeatable: true,
      is_featured: true,
      display_order: 101,
    });
  }

  // Insert new challenges if any
  if (newChallenges.length > 0) {
    await knex('challenge_definitions').insert(newChallenges);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove the special challenges added by this migration
  await knex('challenge_definitions')
    .whereIn('key', [
      'DAILY_SEND_5_MESSAGES',
      'DAILY_COMPLETE_PROFILE',
      'WEEKLY_3_MATCHES',
      'WEEKLY_LOGIN_5_DAYS',
      'SPECIAL_VERIFY_PHOTO',
      'SPECIAL_REFER_FRIEND',
    ])
    .del();
}
