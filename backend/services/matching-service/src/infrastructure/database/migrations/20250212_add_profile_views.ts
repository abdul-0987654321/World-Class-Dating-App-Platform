import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create profile_views table
  await knex.schema.createTable('profile_views', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('viewer_id').notNullable().index();
    table.uuid('viewed_user_id').notNullable().index();
    table.timestamp('viewed_at').notNullable().defaultTo(knex.fn.now()).index();
    table.string('source').notNullable(); // discovery, search, match_list, top_picks, likes_you
    table.integer('duration').nullable(); // seconds spent viewing

    // Indexes for analytics
    table.index(['viewed_user_id', 'viewed_at']);
    table.index(['viewer_id', 'viewed_at']);
  });

  console.log('Created profile_views table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('profile_views');
  console.log('Dropped profile_views table');
}
