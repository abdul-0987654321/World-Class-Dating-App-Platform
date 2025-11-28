/**
 * Migration: Create Stories and Highlights Tables
 * Tables for user stories (24-hour content), highlights, views, and reactions
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Stories table - main content that expires after 24 hours
  await knex.schema.createTable('stories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('media_type', ['photo', 'video']).notNullable();
    table.string('media_url').notNullable();
    table.string('thumbnail_url');
    table.text('caption');
    table.string('location');
    table.jsonb('location_coordinates'); // { lat: number, lng: number }
    table.jsonb('mentions').defaultTo('[]'); // Array of mentioned user IDs
    table.jsonb('hashtags').defaultTo('[]'); // Array of hashtags
    table.string('music_track_id'); // Optional background music
    table.string('music_track_name');
    table.jsonb('stickers').defaultTo('[]'); // Array of sticker objects with positions
    table.jsonb('text_overlays').defaultTo('[]'); // Array of text overlay objects
    table.jsonb('filters').defaultTo('{}'); // Applied filters/effects
    table.integer('duration_seconds').defaultTo(10); // For videos
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_archived').notNullable().defaultTo(false);
    table.enum('visibility', ['public', 'matches_only', 'close_friends']).notNullable().defaultTo('public');
    table.integer('view_count').notNullable().defaultTo(0);
    table.integer('reaction_count').notNullable().defaultTo(0);
    table.integer('reply_count').notNullable().defaultTo(0);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_active', 'expires_at']);
    table.index(['expires_at']);
    table.index(['visibility']);
    table.index('created_at');
  });

  // Story views tracking table
  await knex.schema.createTable('story_views', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.uuid('viewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('view_duration_seconds').defaultTo(0); // How long they watched
    table.boolean('viewed_completely').notNullable().defaultTo(false);
    table.timestamp('viewed_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['story_id', 'viewer_id']);
    table.index(['story_id', 'viewed_at']);
    table.index(['viewer_id', 'viewed_at']);
  });

  // Story reactions table
  await knex.schema.createTable('story_reactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reaction_type').notNullable(); // fire, heart, laugh, wow, sad, clap, etc.
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['story_id', 'user_id']); // One reaction per user per story
    table.index(['story_id']);
    table.index(['user_id']);
  });

  // Story replies (private messages about stories)
  await knex.schema.createTable('story_replies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('message').notNullable();
    table.string('media_url'); // Optional photo/video reply
    table.enum('media_type', ['text', 'photo', 'video', 'voice']).notNullable().defaultTo('text');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['story_id']);
    table.index(['sender_id']);
    table.index(['recipient_id', 'is_read']);
  });

  // Highlights table - curated collections of archived stories
  await knex.schema.createTable('highlights', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.string('cover_image_url');
    table.string('emoji'); // Emoji icon for highlight
    table.integer('story_count').notNullable().defaultTo(0);
    table.integer('view_count').notNullable().defaultTo(0);
    table.integer('display_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_active', 'display_order']);
  });

  // Highlight stories junction table
  await knex.schema.createTable('highlight_stories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('highlight_id').notNullable().references('id').inTable('highlights').onDelete('CASCADE');
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.integer('display_order').notNullable().defaultTo(0);
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['highlight_id', 'story_id']);
    table.index(['highlight_id', 'display_order']);
  });

  // Story templates table - pre-designed templates for creating stories
  await knex.schema.createTable('story_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable(); // dating, travel, fitness, food, etc.
    table.string('preview_url').notNullable();
    table.jsonb('template_config').notNullable(); // Template configuration (colors, fonts, layout)
    table.boolean('is_premium').notNullable().defaultTo(false);
    table.integer('coin_cost').defaultTo(0);
    table.integer('usage_count').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['category', 'is_active']);
    table.index(['is_premium']);
  });

  // Close friends list for story visibility
  await knex.schema.createTable('close_friends', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('friend_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'friend_id']);
    table.index(['user_id']);
    table.index(['friend_id']);
  });

  // Story analytics for creators
  await knex.schema.createTable('story_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.integer('impressions').notNullable().defaultTo(0);
    table.integer('unique_viewers').notNullable().defaultTo(0);
    table.integer('forward_taps').notNullable().defaultTo(0); // Skipped forward
    table.integer('backward_taps').notNullable().defaultTo(0); // Went back
    table.integer('exits').notNullable().defaultTo(0); // Left before completion
    table.integer('profile_visits').notNullable().defaultTo(0); // Clicked profile from story
    table.integer('replies').notNullable().defaultTo(0);
    table.decimal('avg_view_duration', 8, 2).defaultTo(0);
    table.decimal('completion_rate', 5, 2).defaultTo(0); // Percentage who viewed completely
    table.jsonb('viewer_demographics').defaultTo('{}'); // Age, location breakdown
    table.jsonb('hourly_views').defaultTo('{}'); // Views by hour
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique('story_id');
  });

  // Seed default story templates
  await knex('story_templates').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Date Night',
      description: 'Perfect for sharing your date night moments',
      category: 'dating',
      preview_url: '/templates/date-night.png',
      template_config: JSON.stringify({
        background: 'gradient-rose',
        font: 'Playfair Display',
        textColor: '#FFFFFF',
        overlay: 'hearts',
      }),
      is_premium: false,
      coin_cost: 0,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Adventure Seeker',
      description: 'For your travel and adventure stories',
      category: 'travel',
      preview_url: '/templates/adventure.png',
      template_config: JSON.stringify({
        background: 'gradient-ocean',
        font: 'Montserrat',
        textColor: '#FFFFFF',
        overlay: 'compass',
      }),
      is_premium: false,
      coin_cost: 0,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Fitness Goals',
      description: 'Show off your workout progress',
      category: 'fitness',
      preview_url: '/templates/fitness.png',
      template_config: JSON.stringify({
        background: 'gradient-energy',
        font: 'Oswald',
        textColor: '#FFFFFF',
        overlay: 'fire',
      }),
      is_premium: false,
      coin_cost: 0,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Premium Glow',
      description: 'Elegant golden aesthetic',
      category: 'premium',
      preview_url: '/templates/glow.png',
      template_config: JSON.stringify({
        background: 'gradient-gold',
        font: 'Cormorant Garamond',
        textColor: '#1A1A1A',
        overlay: 'sparkles',
        border: 'gold',
      }),
      is_premium: true,
      coin_cost: 50,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Foodie Vibes',
      description: 'Share your culinary adventures',
      category: 'food',
      preview_url: '/templates/foodie.png',
      template_config: JSON.stringify({
        background: 'gradient-warm',
        font: 'Lora',
        textColor: '#FFFFFF',
        overlay: 'utensils',
      }),
      is_premium: false,
      coin_cost: 0,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('story_analytics');
  await knex.schema.dropTableIfExists('close_friends');
  await knex.schema.dropTableIfExists('story_templates');
  await knex.schema.dropTableIfExists('highlight_stories');
  await knex.schema.dropTableIfExists('highlights');
  await knex.schema.dropTableIfExists('story_replies');
  await knex.schema.dropTableIfExists('story_reactions');
  await knex.schema.dropTableIfExists('story_views');
  await knex.schema.dropTableIfExists('stories');
}
