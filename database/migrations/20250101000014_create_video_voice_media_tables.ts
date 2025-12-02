import { Knex } from 'knex';

/**
 * Migration: Create Video and Voice Media Tables
 * Creates comprehensive tables for video profiles, voice notes, and voice prompts
 */
export async function up(knex: Knex): Promise<void> {
  // Create videos table for profile videos and video prompts
  await knex.schema.createTable('videos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Video file information
    table.string('file_name', 255).notNullable();
    table.string('original_name', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('size').notNullable(); // Size in bytes
    table.integer('duration').notNullable(); // Duration in seconds

    // Storage URLs
    table.text('original_url').notNullable();
    table.text('compressed_url').notNullable();
    table.jsonb('thumbnail_urls').notNullable(); // Array of thumbnail URLs

    // Video metadata
    table.integer('width');
    table.integer('height');
    table.string('codec', 50);
    table.integer('bitrate'); // Bitrate in kbps
    table.integer('frame_rate'); // FPS

    // Video type and context
    table.enum('video_type', ['profile', 'prompt', 'story']).notNullable().defaultTo('profile');
    table.uuid('prompt_id').nullable(); // Reference to prompt if this is a prompt response

    // Moderation
    table.enum('moderation_status', ['pending', 'approved', 'rejected', 'flagged'])
      .notNullable()
      .defaultTo('pending');
    table.jsonb('moderation_result').nullable();
    table.timestamp('moderated_at').nullable();
    table.uuid('moderated_by').nullable().references('id').inTable('users');

    // Analytics
    table.integer('view_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.integer('share_count').defaultTo(0);

    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_primary').defaultTo(false); // Is this the primary profile video?

    // Timestamps
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  // Create voice_notes table for voice messages and voice prompts
  await knex.schema.createTable('voice_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Audio file information
    table.string('file_name', 255).notNullable();
    table.string('original_name', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('size').notNullable(); // Size in bytes
    table.integer('duration').notNullable(); // Duration in seconds (max 60)

    // Storage URL
    table.text('url').notNullable();

    // Waveform data for visualization
    table.jsonb('waveform_data').notNullable(); // { samples, duration, sampleRate, peaks }

    // Audio metadata
    table.integer('sample_rate').nullable(); // Hz
    table.integer('bitrate').nullable(); // kbps
    table.string('codec', 50).nullable();

    // Context and references
    table.enum('context', ['profile', 'prompt', 'message']).notNullable().defaultTo('message');
    table.uuid('prompt_id').nullable(); // Reference to prompt if this is a prompt response
    table.uuid('conversation_id').nullable(); // Reference to conversation if this is a message
    table.uuid('message_id').nullable(); // Reference to message in MongoDB

    // Moderation
    table.enum('moderation_status', ['pending', 'approved', 'rejected', 'flagged'])
      .notNullable()
      .defaultTo('pending');
    table.jsonb('moderation_result').nullable();
    table.timestamp('moderated_at').nullable();

    // Playback tracking
    table.integer('play_count').defaultTo(0);
    table.timestamp('last_played_at').nullable();

    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_transcribed').defaultTo(false);
    table.text('transcript').nullable(); // AI-generated transcript

    // Timestamps
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  // Create profile_prompts table to store available prompts
  await knex.schema.createTable('profile_prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Prompt information
    table.string('prompt_text', 500).notNullable();
    table.string('category', 100).notNullable(); // e.g., 'about_me', 'interests', 'fun_facts'
    table.enum('response_type', ['text', 'voice', 'video', 'both']).notNullable().defaultTo('both');

    // Display settings
    table.string('icon', 50).nullable();
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_premium').defaultTo(false); // Premium users only

    // Analytics
    table.integer('usage_count').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create prompt_responses table to link users with their prompt responses
  await knex.schema.createTable('prompt_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('prompt_id').notNullable().references('id').inTable('profile_prompts').onDelete('CASCADE');

    // Response content
    table.enum('response_type', ['text', 'voice', 'video']).notNullable();
    table.text('text_response').nullable();
    table.uuid('voice_note_id').nullable().references('id').inTable('voice_notes').onDelete('SET NULL');
    table.uuid('video_id').nullable().references('id').inTable('videos').onDelete('SET NULL');

    // Display settings
    table.integer('display_order').defaultTo(0);
    table.boolean('is_visible').defaultTo(true);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Ensure unique user-prompt combination
    table.unique(['user_id', 'prompt_id']);
  });

  // Create video_views table to track video views
  await knex.schema.createTable('video_views', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('video_id').notNullable().references('id').inTable('videos').onDelete('CASCADE');
    table.uuid('viewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // View information
    table.integer('watch_duration').notNullable(); // Seconds watched
    table.boolean('watched_complete').defaultTo(false);
    table.string('device_type', 50).nullable(); // 'mobile', 'web', 'tablet'

    // Timestamps
    table.timestamp('viewed_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create indexes for videos table
  await knex.schema.table('videos', (table) => {
    table.index('user_id', 'idx_videos_user_id');
    table.index('video_type', 'idx_videos_type');
    table.index('moderation_status', 'idx_videos_moderation');
    table.index('is_primary', 'idx_videos_primary');
    table.index(['user_id', 'video_type'], 'idx_videos_user_type');
    table.index(['user_id', 'is_primary'], 'idx_videos_user_primary');
    table.index('uploaded_at', 'idx_videos_uploaded');
    table.index('deleted_at', 'idx_videos_deleted');
  });

  // Create indexes for voice_notes table
  await knex.schema.table('voice_notes', (table) => {
    table.index('user_id', 'idx_voice_notes_user_id');
    table.index('context', 'idx_voice_notes_context');
    table.index('moderation_status', 'idx_voice_notes_moderation');
    table.index('conversation_id', 'idx_voice_notes_conversation');
    table.index(['user_id', 'context'], 'idx_voice_notes_user_context');
    table.index(['user_id', 'prompt_id'], 'idx_voice_notes_user_prompt');
    table.index('uploaded_at', 'idx_voice_notes_uploaded');
    table.index('deleted_at', 'idx_voice_notes_deleted');
  });

  // Create indexes for prompt_responses table
  await knex.schema.table('prompt_responses', (table) => {
    table.index('user_id', 'idx_prompt_responses_user');
    table.index('prompt_id', 'idx_prompt_responses_prompt');
    table.index(['user_id', 'is_visible'], 'idx_prompt_responses_visible');
  });

  // Create indexes for video_views table
  await knex.schema.table('video_views', (table) => {
    table.index('video_id', 'idx_video_views_video');
    table.index('viewer_id', 'idx_video_views_viewer');
    table.index(['video_id', 'viewer_id'], 'idx_video_views_video_viewer');
    table.index('viewed_at', 'idx_video_views_viewed_at');
  });

  // Insert some default prompts
  await knex('profile_prompts').insert([
    {
      prompt_text: 'A perfect day for me would be...',
      category: 'lifestyle',
      response_type: 'both',
      icon: 'sun',
      display_order: 1,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'My most controversial opinion is...',
      category: 'personality',
      response_type: 'both',
      icon: 'sparkles',
      display_order: 2,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'The key to my heart is...',
      category: 'dating',
      response_type: 'both',
      icon: 'heart',
      display_order: 3,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'My hidden talent is...',
      category: 'fun_facts',
      response_type: 'both',
      icon: 'star',
      display_order: 4,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'I geek out on...',
      category: 'interests',
      response_type: 'both',
      icon: 'book',
      display_order: 5,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'Tell me about yourself in 30 seconds',
      category: 'about_me',
      response_type: 'voice',
      icon: 'mic',
      display_order: 6,
      is_active: true,
      is_premium: false,
    },
    {
      prompt_text: 'Show me your world',
      category: 'lifestyle',
      response_type: 'video',
      icon: 'video',
      display_order: 7,
      is_active: true,
      is_premium: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('video_views');
  await knex.schema.dropTableIfExists('prompt_responses');
  await knex.schema.dropTableIfExists('profile_prompts');
  await knex.schema.dropTableIfExists('voice_notes');
  await knex.schema.dropTableIfExists('videos');
}
