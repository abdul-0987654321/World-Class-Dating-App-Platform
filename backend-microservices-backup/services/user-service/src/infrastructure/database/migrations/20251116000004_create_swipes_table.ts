import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('swipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('swiper_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('swiped_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();
    table.timestamp('swiped_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('swiper_id');
    table.index('swiped_id');
    table.index(['swiper_id', 'swiped_id']);
    table.index(['swiped_id', 'swiper_id']);
    table.index('action');
    table.unique(['swiper_id', 'swiped_id']); // Each user can only swipe once on another user
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('swipes');
}
