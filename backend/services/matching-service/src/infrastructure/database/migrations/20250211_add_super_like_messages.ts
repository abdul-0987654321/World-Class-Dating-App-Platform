import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create super_like_messages table
  await knex.schema.createTable('super_like_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('target_user_id').notNullable().index();
    table.uuid('swipe_id').notNullable().references('id').inTable('swipes').onDelete('CASCADE');
    table.text('message').notNullable();
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['target_user_id', 'read']);
    table.unique(['swipe_id']); // One message per swipe
  });

  console.log('Created super_like_messages table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('super_like_messages');
  console.log('Dropped super_like_messages table');
}
