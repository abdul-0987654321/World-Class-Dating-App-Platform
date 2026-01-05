import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Communities table
  await knex.schema.createTable('communities', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').notNullable();
    table.string('icon', 10).notNullable();
    table.string('cover_image', 500).nullable();
    table.integer('member_count').notNullable().defaultTo(0);
    table.integer('post_count').notNullable().defaultTo(0);
    table
      .enum('category', [
        'Lifestyle',
        'Food',
        'Health',
        'Culture',
        'Pets',
        'Entertainment',
        'Music',
        'Adventure',
        'Technology',
        'Art',
        'Sports',
        'Gaming',
        'Travel',
        'Other',
      ])
      .notNullable();
    table.string('color', 100).notNullable().defaultTo('from-pink-400 to-purple-400');
    table.jsonb('rules').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('category');
    table.index('is_active');
    table.index('member_count');
    table.index(['name', 'description']); // For search
  });

  // Community members table
  await knex.schema.createTable('community_members', (table) => {
    table.uuid('id').primary();
    table
      .uuid('community_id')
      .notNullable()
      .references('id')
      .inTable('communities')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['member', 'moderator', 'admin']).notNullable().defaultTo('member');
    table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['community_id', 'user_id']);
    table.index('community_id');
    table.index('user_id');
    table.index('role');
  });

  // Community posts table
  await knex.schema.createTable('community_posts', (table) => {
    table.uuid('id').primary();
    table
      .uuid('community_id')
      .notNullable()
      .references('id')
      .inTable('communities')
      .onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.jsonb('images').nullable();
    table.integer('like_count').notNullable().defaultTo(0);
    table.integer('comment_count').notNullable().defaultTo(0);
    table.boolean('is_pinned').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('community_id');
    table.index('author_id');
    table.index('is_pinned');
    table.index('created_at');
    table.index(['community_id', 'is_pinned', 'created_at']);
  });

  // Community post likes table
  await knex.schema.createTable('community_post_likes', (table) => {
    table.uuid('id').primary();
    table
      .uuid('post_id')
      .notNullable()
      .references('id')
      .inTable('community_posts')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['post_id', 'user_id']);
    table.index('post_id');
    table.index('user_id');
  });

  // Community comments table
  await knex.schema.createTable('community_comments', (table) => {
    table.uuid('id').primary();
    table
      .uuid('post_id')
      .notNullable()
      .references('id')
      .inTable('community_posts')
      .onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('parent_id')
      .nullable()
      .references('id')
      .inTable('community_comments')
      .onDelete('CASCADE');
    table.text('content').notNullable();
    table.integer('like_count').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('post_id');
    table.index('author_id');
    table.index('parent_id');
    table.index('created_at');
  });

  // Community comment likes table
  await knex.schema.createTable('community_comment_likes', (table) => {
    table.uuid('id').primary();
    table
      .uuid('comment_id')
      .notNullable()
      .references('id')
      .inTable('community_comments')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['comment_id', 'user_id']);
    table.index('comment_id');
    table.index('user_id');
  });

  // Community events table
  await knex.schema.createTable('community_events', (table) => {
    table.uuid('id').primary();
    table
      .uuid('community_id')
      .notNullable()
      .references('id')
      .inTable('communities')
      .onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').nullable();
    table.string('location', 500).notNullable();
    table.boolean('is_virtual').notNullable().defaultTo(false);
    table.string('meeting_link', 500).nullable();
    table.integer('attendee_count').notNullable().defaultTo(0);
    table.integer('max_attendees').notNullable().defaultTo(100);
    table.uuid('host_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('cover_image', 500).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('community_id');
    table.index('host_id');
    table.index('start_date');
    table.index(['community_id', 'start_date']);
  });

  // Community event attendees table
  await knex.schema.createTable('community_event_attendees', (table) => {
    table.uuid('id').primary();
    table
      .uuid('event_id')
      .notNullable()
      .references('id')
      .inTable('community_events')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('registered_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_id', 'user_id']);
    table.index('event_id');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('community_event_attendees');
  await knex.schema.dropTableIfExists('community_events');
  await knex.schema.dropTableIfExists('community_comment_likes');
  await knex.schema.dropTableIfExists('community_comments');
  await knex.schema.dropTableIfExists('community_post_likes');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('community_members');
  await knex.schema.dropTableIfExists('communities');
}
