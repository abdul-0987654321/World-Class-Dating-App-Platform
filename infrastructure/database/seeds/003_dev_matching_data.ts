import { Knex } from 'knex';

/**
 * Seed: Development Matching Data
 * Creates sample swipes, matches, and likes for testing
 */
export async function seed(knex: Knex): Promise<void> {
  // Sample swipes data
  const swipes = [
    // Alice swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      target_user_id: '550e8400-e29b-41d4-a716-446655440002',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      target_user_id: '550e8400-e29b-41d4-a716-446655440004',
      action: 'like',
      is_super_like: true,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      target_user_id: '550e8400-e29b-41d4-a716-446655440006',
      action: 'pass',
      is_super_like: false,
    },
    // Bob swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      target_user_id: '550e8400-e29b-41d4-a716-446655440001',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      target_user_id: '550e8400-e29b-41d4-a716-446655440003',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      target_user_id: '550e8400-e29b-41d4-a716-446655440005',
      action: 'super_like',
      is_super_like: true,
    },
    // Carol swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      target_user_id: '550e8400-e29b-41d4-a716-446655440002',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      target_user_id: '550e8400-e29b-41d4-a716-446655440004',
      action: 'pass',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      target_user_id: '550e8400-e29b-41d4-a716-446655440006',
      action: 'like',
      is_super_like: false,
    },
    // David swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      target_user_id: '550e8400-e29b-41d4-a716-446655440001',
      action: 'pass',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      target_user_id: '550e8400-e29b-41d4-a716-446655440003',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      target_user_id: '550e8400-e29b-41d4-a716-446655440005',
      action: 'like',
      is_super_like: true,
    },
    // Emily swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      target_user_id: '550e8400-e29b-41d4-a716-446655440002',
      action: 'pass',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      target_user_id: '550e8400-e29b-41d4-a716-446655440004',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      target_user_id: '550e8400-e29b-41d4-a716-446655440006',
      action: 'like',
      is_super_like: false,
    },
    // Frank swipes
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      target_user_id: '550e8400-e29b-41d4-a716-446655440001',
      action: 'like',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      target_user_id: '550e8400-e29b-41d4-a716-446655440003',
      action: 'pass',
      is_super_like: false,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      target_user_id: '550e8400-e29b-41d4-a716-446655440005',
      action: 'like',
      is_super_like: false,
    },
  ];

  await knex('swipes').insert(swipes);

  // Sample matches data
  // Match 1: Alice (001) <-> Bob (002)
  // Match 2: Bob (002) <-> Carol (003)
  // Match 3: David (004) <-> Emily (005)
  // Match 4: Emily (005) <-> Frank (006)
  const matches = [
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      user1_id: '550e8400-e29b-41d4-a716-446655440001', // Alice
      user2_id: '550e8400-e29b-41d4-a716-446655440002', // Bob
      status: 'active',
      compatibility_score: 87.5,
      matched_at: knex.raw("NOW() - INTERVAL '2 days'"),
      last_activity_at: knex.raw("NOW() - INTERVAL '1 hour'"),
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440002',
      user1_id: '550e8400-e29b-41d4-a716-446655440002', // Bob
      user2_id: '550e8400-e29b-41d4-a716-446655440003', // Carol
      status: 'active',
      compatibility_score: 92.3,
      matched_at: knex.raw("NOW() - INTERVAL '1 day'"),
      last_activity_at: knex.raw("NOW() - INTERVAL '30 minutes'"),
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440003',
      user1_id: '550e8400-e29b-41d4-a716-446655440004', // David
      user2_id: '550e8400-e29b-41d4-a716-446655440005', // Emily
      status: 'active',
      compatibility_score: 78.9,
      matched_at: knex.raw("NOW() - INTERVAL '3 days'"),
      last_activity_at: knex.raw("NOW() - INTERVAL '2 hours'"),
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440004',
      user1_id: '550e8400-e29b-41d4-a716-446655440005', // Emily
      user2_id: '550e8400-e29b-41d4-a716-446655440006', // Frank
      status: 'active',
      compatibility_score: 85.0,
      matched_at: knex.raw("NOW() - INTERVAL '5 hours'"),
      last_activity_at: knex.raw("NOW() - INTERVAL '10 minutes'"),
    },
  ];

  await knex('matches').insert(matches);

  console.log('✓ Seeded swipes and matches');
}
