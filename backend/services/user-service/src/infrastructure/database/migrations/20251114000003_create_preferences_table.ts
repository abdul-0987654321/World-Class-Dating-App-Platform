import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('age_min').defaultTo(18);
    table.integer('age_max').defaultTo(100);
    table.integer('distance_max').defaultTo(50); // in km
    table.jsonb('genders').defaultTo('[]');
    table.enum('show_me', ['men', 'women', 'everyone']).defaultTo('everyone');
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('preferences');
}
