import { Knex } from 'knex';

/**
 * Seed: Development Conversations and Messages
 * Creates sample conversations and messages between matched users
 */
export async function seed(knex: Knex): Promise<void> {
  // Sample conversations data
  const conversations = [
    {
      id: '750e8400-e29b-41d4-a716-446655440001',
      user1_id: '550e8400-e29b-41d4-a716-446655440001', // Alice
      user2_id: '550e8400-e29b-41d4-a716-446655440002', // Bob
      match_id: '650e8400-e29b-41d4-a716-446655440001',
      last_message: "That sounds great! I'll see you Saturday then!",
      last_message_at: knex.raw("NOW() - INTERVAL '1 hour'"),
      last_message_sender_id: '550e8400-e29b-41d4-a716-446655440002',
      unread_count_user1: 1,
      unread_count_user2: 0,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440002',
      user1_id: '550e8400-e29b-41d4-a716-446655440002', // Bob
      user2_id: '550e8400-e29b-41d4-a716-446655440003', // Carol
      match_id: '650e8400-e29b-41d4-a716-446655440002',
      last_message: 'I love that book series too! Have you read the latest one?',
      last_message_at: knex.raw("NOW() - INTERVAL '30 minutes'"),
      last_message_sender_id: '550e8400-e29b-41d4-a716-446655440003',
      unread_count_user1: 1,
      unread_count_user2: 0,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440003',
      user1_id: '550e8400-e29b-41d4-a716-446655440004', // David
      user2_id: '550e8400-e29b-41d4-a716-446655440005', // Emily
      match_id: '650e8400-e29b-41d4-a716-446655440003',
      last_message: 'What kind of music do you listen to while traveling?',
      last_message_at: knex.raw("NOW() - INTERVAL '2 hours'"),
      last_message_sender_id: '550e8400-e29b-41d4-a716-446655440005',
      unread_count_user1: 2,
      unread_count_user2: 0,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440004',
      user1_id: '550e8400-e29b-41d4-a716-446655440005', // Emily
      user2_id: '550e8400-e29b-41d4-a716-446655440006', // Frank
      match_id: '650e8400-e29b-41d4-a716-446655440004',
      last_message: "Hey! Your profile looks really interesting. What's your favorite pizza topping?",
      last_message_at: knex.raw("NOW() - INTERVAL '10 minutes'"),
      last_message_sender_id: '550e8400-e29b-41d4-a716-446655440005',
      unread_count_user1: 0,
      unread_count_user2: 1,
    },
  ];

  await knex('conversations').insert(conversations);

  // Sample messages data
  const messages = [
    // Conversation 1: Alice <-> Bob
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440001',
      receiver_id: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Hi Bob! I noticed you love hiking too. What are your favorite trails?',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '47 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '48 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440002',
      receiver_id: '550e8400-e29b-41d4-a716-446655440001',
      content: "Hey Alice! I'm really into the trails around Marin Headlands. The views are incredible!",
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '46 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '47 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440001',
      receiver_id: '550e8400-e29b-41d4-a716-446655440002',
      content: "Oh I love that area! Have you been to Lands End? It's one of my favorites for photography.",
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '45 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '46 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440002',
      receiver_id: '550e8400-e29b-41d4-a716-446655440001',
      content: "I haven't, but I'd love to check it out! Maybe we could go together this weekend?",
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '2 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '3 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440001',
      receiver_id: '550e8400-e29b-41d4-a716-446655440002',
      content: "That would be awesome! How about Saturday morning around 9 AM?",
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '1 hour 30 minutes'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '2 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440002',
      receiver_id: '550e8400-e29b-41d4-a716-446655440001',
      content: "That sounds great! I'll see you Saturday then!",
      type: 'text',
      is_read: false,
      status: 'delivered',
      sent_at: knex.raw("NOW() - INTERVAL '1 hour'"),
    },

    // Conversation 2: Bob <-> Carol
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440002',
      sender_id: '550e8400-e29b-41d4-a716-446655440002',
      receiver_id: '550e8400-e29b-41d4-a716-446655440003',
      content: 'Hi Carol! Your art looks amazing. Do you have a favorite style you work in?',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '23 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '24 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440002',
      sender_id: '550e8400-e29b-41d4-a716-446655440003',
      receiver_id: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Thanks! I mostly do watercolors and digital illustrations. Your fitness journey is inspiring!',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '22 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '23 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440002',
      sender_id: '550e8400-e29b-41d4-a716-446655440002',
      receiver_id: '550e8400-e29b-41d4-a716-446655440003',
      content: 'I saw you mentioned fantasy novels. Have you read The Name of the Wind?',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '1 hour'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '2 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440002',
      sender_id: '550e8400-e29b-41d4-a716-446655440003',
      receiver_id: '550e8400-e29b-41d4-a716-446655440002',
      content: 'I love that book series too! Have you read the latest one?',
      type: 'text',
      is_read: false,
      status: 'delivered',
      sent_at: knex.raw("NOW() - INTERVAL '30 minutes'"),
    },

    // Conversation 3: David <-> Emily
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440003',
      sender_id: '550e8400-e29b-41d4-a716-446655440004',
      receiver_id: '550e8400-e29b-41d4-a716-446655440005',
      content: 'Hey! I love your travel blog. Which country was your favorite to visit?',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '71 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '72 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440003',
      sender_id: '550e8400-e29b-41d4-a716-446655440005',
      receiver_id: '550e8400-e29b-41d4-a716-446655440004',
      content: 'Thank you! Japan was absolutely incredible. The food, culture, and people were amazing!',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '70 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '71 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440003',
      sender_id: '550e8400-e29b-41d4-a716-446655440004',
      receiver_id: '550e8400-e29b-41d4-a716-446655440005',
      content: "That's awesome! I've always wanted to go. Any must-visit places you'd recommend?",
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '69 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '70 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440003',
      sender_id: '550e8400-e29b-41d4-a716-446655440005',
      receiver_id: '550e8400-e29b-41d4-a716-446655440004',
      content: 'Definitely Kyoto for the temples and traditional culture, and Tokyo for the modern vibe!',
      type: 'text',
      is_read: true,
      read_at: knex.raw("NOW() - INTERVAL '3 hours'"),
      status: 'read',
      sent_at: knex.raw("NOW() - INTERVAL '4 hours'"),
    },
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440003',
      sender_id: '550e8400-e29b-41d4-a716-446655440005',
      receiver_id: '550e8400-e29b-41d4-a716-446655440004',
      content: 'What kind of music do you listen to while traveling?',
      type: 'text',
      is_read: false,
      status: 'delivered',
      sent_at: knex.raw("NOW() - INTERVAL '2 hours'"),
    },

    // Conversation 4: Emily <-> Frank
    {
      conversation_id: '750e8400-e29b-41d4-a716-446655440004',
      sender_id: '550e8400-e29b-41d4-a716-446655440005',
      receiver_id: '550e8400-e29b-41d4-a716-446655440006',
      content: "Hey! Your profile looks really interesting. What's your favorite pizza topping?",
      type: 'text',
      is_read: false,
      status: 'delivered',
      sent_at: knex.raw("NOW() - INTERVAL '10 minutes'"),
    },
  ];

  await knex('messages').insert(messages);

  console.log('✓ Seeded conversations and messages');
}
