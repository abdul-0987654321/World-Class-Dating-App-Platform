/**
 * Group Matching Database Migration
 * Creates tables for group-to-group matching feature
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create groups table
  await knex.schema.createTable('groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('bio').notNullable();
    table.jsonb('photos').defaultTo('[]');
    table.uuid('admin_id').notNullable().index();
    table
      .enum('status', ['active', 'inactive', 'disbanded'])
      .defaultTo('active')
      .notNullable()
      .index();
    table.jsonb('preferences').notNullable().defaultTo('{}');
    table.jsonb('combined_interests').defaultTo('[]');
    table.integer('member_count').defaultTo(1).notNullable();
    table.integer('min_members').defaultTo(2).notNullable();
    table.integer('max_members').defaultTo(8).notNullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.string('city', 100).nullable();
    table.boolean('is_verified').defaultTo(false).notNullable();
    table.boolean('is_premium').defaultTo(false).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for performance
    table.index(['status', 'member_count']);
    table.index(['latitude', 'longitude']);
    table.index('created_at');
  });

  // Create group_members table
  await knex.schema.createTable('group_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table.uuid('user_id').notNullable().index();
    table.enum('role', ['admin', 'member']).defaultTo('member').notNullable();
    table
      .enum('status', ['pending', 'active', 'declined', 'removed', 'left'])
      .defaultTo('pending')
      .notNullable()
      .index();
    table.timestamp('joined_at').nullable();
    table.timestamp('invited_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('invited_by').notNullable();
    table.text('invite_message').nullable();

    // Unique constraint: user can only be in a group once
    table.unique(['group_id', 'user_id']);

    // Indexes
    table.index(['user_id', 'status']);
    table.index(['group_id', 'status']);
  });

  // Create group_swipes table
  await knex.schema.createTable('group_swipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table.uuid('target_group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();
    table.uuid('swiped_by_user_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: a group can only swipe on another group once
    table.unique(['group_id', 'target_group_id']);

    // Indexes
    table.index(['group_id', 'action']);
    table.index(['target_group_id', 'action']);
    table.index('created_at');
  });

  // Create group_matches table
  await knex.schema.createTable('group_matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group1_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table.uuid('group2_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table
      .enum('status', ['pending', 'matched', 'unmatched', 'expired'])
      .defaultTo('matched')
      .notNullable()
      .index();
    table.decimal('compatibility_score', 5, 2).defaultTo(0);
    table.timestamp('matched_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('conversation_id').nullable();
    table.timestamp('expires_at').nullable();
    table.boolean('expired').defaultTo(false).notNullable();
    table.boolean('first_message_sent').defaultTo(false).notNullable();
    table.timestamp('unmatched_at').nullable();

    // Unique constraint: no duplicate matches
    table.unique(['group1_id', 'group2_id']);

    // Indexes
    table.index(['group1_id', 'status']);
    table.index(['group2_id', 'status']);
    table.index('matched_at');
    table.index(['expires_at', 'expired', 'first_message_sent']);
  });

  // Create group_activity_suggestions table
  await knex.schema.createTable('group_activity_suggestions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.string('category', 100).notNullable().index();
    table.text('description').notNullable();
    table.integer('ideal_group_size_min').defaultTo(2);
    table.integer('ideal_group_size_max').defaultTo(8);
    table.string('estimated_duration', 50).nullable();
    table.enum('estimated_cost', ['free', 'budget', 'moderate', 'expensive']).nullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.string('address', 500).nullable();
    table.string('venue_name', 200).nullable();
    table.jsonb('tags').defaultTo('[]');
    table.decimal('rating', 3, 2).nullable();
    table.string('image_url', 500).nullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index('is_active');
    table.index(['latitude', 'longitude']);
  });

  // Create updated_at triggers
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_groups_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_groups_timestamp
      BEFORE UPDATE ON groups
      FOR EACH ROW
      EXECUTE FUNCTION update_groups_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER update_group_matches_activity
      BEFORE UPDATE ON group_matches
      FOR EACH ROW
      EXECUTE FUNCTION update_last_activity();
  `);

  await knex.raw(`
    CREATE TRIGGER update_group_activity_suggestions_timestamp
      BEFORE UPDATE ON group_activity_suggestions
      FOR EACH ROW
      EXECUTE FUNCTION update_groups_updated_at();
  `);

  // Insert default activity suggestions
  await knex('group_activity_suggestions').insert([
    {
      name: 'Escape Room Adventure',
      category: 'entertainment',
      description: 'Work together to solve puzzles and escape within the time limit. Great for building teamwork!',
      ideal_group_size_min: 4,
      ideal_group_size_max: 8,
      estimated_duration: '1-2 hours',
      estimated_cost: 'moderate',
      tags: JSON.stringify(['teamwork', 'puzzles', 'adventure', 'indoor']),
    },
    {
      name: 'Group Cooking Class',
      category: 'food',
      description: 'Learn to cook a new cuisine together. Perfect for food lovers!',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '2-3 hours',
      estimated_cost: 'moderate',
      tags: JSON.stringify(['cooking', 'food', 'learning', 'indoor']),
    },
    {
      name: 'Bowling Night',
      category: 'sports',
      description: 'Classic bowling with a competitive twist. Teams face off for bragging rights!',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '2-3 hours',
      estimated_cost: 'budget',
      tags: JSON.stringify(['bowling', 'sports', 'competition', 'indoor']),
    },
    {
      name: 'Trivia Night',
      category: 'entertainment',
      description: 'Test your knowledge together at a local trivia night.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 8,
      estimated_duration: '2-3 hours',
      estimated_cost: 'budget',
      tags: JSON.stringify(['trivia', 'knowledge', 'drinks', 'indoor']),
    },
    {
      name: 'Hiking Adventure',
      category: 'outdoor',
      description: 'Explore nature trails together and enjoy the great outdoors.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 10,
      estimated_duration: '3-5 hours',
      estimated_cost: 'free',
      tags: JSON.stringify(['hiking', 'nature', 'outdoor', 'fitness']),
    },
    {
      name: 'Game Night',
      category: 'entertainment',
      description: 'Board games, card games, or video games - pick your favorites!',
      ideal_group_size_min: 4,
      ideal_group_size_max: 10,
      estimated_duration: '3-4 hours',
      estimated_cost: 'free',
      tags: JSON.stringify(['games', 'board games', 'indoor', 'casual']),
    },
    {
      name: 'Wine Tasting',
      category: 'food',
      description: 'Visit a local winery or host your own wine tasting experience.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '2-3 hours',
      estimated_cost: 'moderate',
      tags: JSON.stringify(['wine', 'tasting', 'social', 'classy']),
    },
    {
      name: 'Karaoke Night',
      category: 'entertainment',
      description: 'Show off your singing skills (or lack thereof) with friends!',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '2-4 hours',
      estimated_cost: 'budget',
      tags: JSON.stringify(['karaoke', 'singing', 'fun', 'nightlife']),
    },
    {
      name: 'Beach Day',
      category: 'outdoor',
      description: 'Sun, sand, and beach volleyball - the perfect group outing.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 16,
      estimated_duration: '4-6 hours',
      estimated_cost: 'free',
      tags: JSON.stringify(['beach', 'outdoor', 'summer', 'volleyball']),
    },
    {
      name: 'Mini Golf Tournament',
      category: 'sports',
      description: 'Friendly competition with creative obstacles and fun themes.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '1-2 hours',
      estimated_cost: 'budget',
      tags: JSON.stringify(['mini golf', 'competition', 'outdoor', 'casual']),
    },
    {
      name: 'Pottery Class',
      category: 'arts',
      description: 'Get creative and make your own pottery together.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 10,
      estimated_duration: '2-3 hours',
      estimated_cost: 'moderate',
      tags: JSON.stringify(['pottery', 'arts', 'creative', 'indoor']),
    },
    {
      name: 'Food Tour',
      category: 'food',
      description: 'Explore local restaurants and try various cuisines together.',
      ideal_group_size_min: 4,
      ideal_group_size_max: 12,
      estimated_duration: '3-4 hours',
      estimated_cost: 'moderate',
      tags: JSON.stringify(['food', 'tour', 'exploration', 'social']),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_group_activity_suggestions_timestamp ON group_activity_suggestions');
  await knex.raw('DROP TRIGGER IF EXISTS update_group_matches_activity ON group_matches');
  await knex.raw('DROP TRIGGER IF EXISTS update_groups_timestamp ON groups');
  await knex.raw('DROP FUNCTION IF EXISTS update_groups_updated_at');

  await knex.schema.dropTableIfExists('group_activity_suggestions');
  await knex.schema.dropTableIfExists('group_matches');
  await knex.schema.dropTableIfExists('group_swipes');
  await knex.schema.dropTableIfExists('group_members');
  await knex.schema.dropTableIfExists('groups');
}
