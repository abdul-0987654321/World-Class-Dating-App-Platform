import { Knex } from 'knex';

/**
 * Seed: Development Photos and Prompts
 * Creates sample photos and prompt answers for test users
 */
export async function seed(knex: Knex): Promise<void> {
  // Sample photos data
  const photos = [
    // Alice's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      url: 'https://randomuser.me/api/portraits/women/1.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
      position: 0,
      is_primary: true,
      is_verified: true,
      storage_key: 'users/alice/photo-1.jpg',
      moderation_status: 'approved',
      verified_at: knex.fn.now(),
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      url: 'https://randomuser.me/api/portraits/women/2.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/2.jpg',
      position: 1,
      is_primary: false,
      is_verified: false,
      storage_key: 'users/alice/photo-2.jpg',
      moderation_status: 'approved',
    },
    // Bob's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      url: 'https://randomuser.me/api/portraits/men/1.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
      position: 0,
      is_primary: true,
      is_verified: false,
      storage_key: 'users/bob/photo-1.jpg',
      moderation_status: 'approved',
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      url: 'https://randomuser.me/api/portraits/men/2.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/men/2.jpg',
      position: 1,
      is_primary: false,
      is_verified: false,
      storage_key: 'users/bob/photo-2.jpg',
      moderation_status: 'approved',
    },
    // Carol's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      url: 'https://randomuser.me/api/portraits/women/3.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/3.jpg',
      position: 0,
      is_primary: true,
      is_verified: true,
      storage_key: 'users/carol/photo-1.jpg',
      moderation_status: 'approved',
      verified_at: knex.fn.now(),
    },
    // David's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      url: 'https://randomuser.me/api/portraits/men/3.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
      position: 0,
      is_primary: true,
      is_verified: false,
      storage_key: 'users/david/photo-1.jpg',
      moderation_status: 'approved',
    },
    // Emily's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      url: 'https://randomuser.me/api/portraits/women/4.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/4.jpg',
      position: 0,
      is_primary: true,
      is_verified: true,
      storage_key: 'users/emily/photo-1.jpg',
      moderation_status: 'approved',
      verified_at: knex.fn.now(),
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      url: 'https://randomuser.me/api/portraits/women/5.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/5.jpg',
      position: 1,
      is_primary: false,
      is_verified: false,
      storage_key: 'users/emily/photo-2.jpg',
      moderation_status: 'approved',
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      url: 'https://randomuser.me/api/portraits/women/6.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/women/6.jpg',
      position: 2,
      is_primary: false,
      is_verified: false,
      storage_key: 'users/emily/photo-3.jpg',
      moderation_status: 'approved',
    },
    // Frank's photos
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      url: 'https://randomuser.me/api/portraits/men/4.jpg',
      thumbnail_url: 'https://randomuser.me/api/portraits/thumb/men/4.jpg',
      position: 0,
      is_primary: true,
      is_verified: false,
      storage_key: 'users/frank/photo-1.jpg',
      moderation_status: 'approved',
    },
  ];

  await knex('photos').insert(photos);

  // Get prompt IDs for reference
  const prompts = await knex('prompts').select('id', 'question');

  // Sample user prompts (answers to profile questions)
  const userPrompts = [
    // Alice's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      prompt_id: prompts[0].id, // My ideal Sunday
      answer: 'Starting with a sunrise hike, then brunch with friends, and ending with a cozy movie night.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      prompt_id: prompts[1].id, // I geek out on
      answer: 'New camera gear and photography techniques. I can talk about aperture settings for hours!',
      display_order: 1,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      prompt_id: prompts[2].id, // Perfect first date
      answer: 'A food truck crawl followed by live music at a local venue.',
      display_order: 2,
    },
    // Bob's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      prompt_id: prompts[0].id,
      answer: 'Morning workout, walk my dog at the beach, and meal prep for the week.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      prompt_id: prompts[3].id, // Way to win me over
      answer: 'Be genuine, love dogs, and share my passion for health and fitness.',
      display_order: 1,
    },
    // Carol's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      prompt_id: prompts[1].id,
      answer: 'Fantasy novels and watercolor painting. Currently obsessed with Lord of the Rings.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      prompt_id: prompts[2].id,
      answer: 'Coffee shop date where we can talk about our favorite books and artists.',
      display_order: 1,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      prompt_id: prompts[6].id, // Free time
      answer: 'Reading in cozy cafes, sketching in the park, or binge-watching sci-fi shows.',
      display_order: 2,
    },
    // David's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      prompt_id: prompts[1].id,
      answer: 'Vinyl records and analog synthesizers. My collection is my pride and joy.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      prompt_id: prompts[5].id, // Greatest adventure
      answer: 'Backpacking through Europe, playing street music in different cities.',
      display_order: 1,
    },
    // Emily's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      prompt_id: prompts[0].id,
      answer: 'Exploring a new neighborhood, trying exotic foods, and writing about my discoveries.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      prompt_id: prompts[5].id,
      answer: 'Solo backpacking through Southeast Asia for 6 months. Life-changing experience!',
      display_order: 1,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      prompt_id: prompts[4].id, // Looking for someone who
      answer: 'Loves to travel, try new cuisines, and has interesting stories to share.',
      display_order: 2,
    },
    // Frank's answers
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      prompt_id: prompts[1].id,
      answer: 'AI and machine learning. Building cool projects that make a difference.',
      display_order: 0,
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      prompt_id: prompts[6].id,
      answer: 'Coding side projects, gaming with friends, and hunting for the best pizza in town.',
      display_order: 1,
    },
  ];

  await knex('user_prompts').insert(userPrompts);

  console.log('✓ Seeded photos and prompt answers');
}
