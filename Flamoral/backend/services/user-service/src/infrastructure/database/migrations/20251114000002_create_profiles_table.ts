import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('bio');
    table.string('occupation', 100);
    table.string('education', 100);
    table.integer('height'); // in cm
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.jsonb('interests').defaultTo('[]');
    table.jsonb('languages').defaultTo('[]');
    table.boolean('is_photo_verified').defaultTo(false);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index(['latitude', 'longitude']);
    table.index('city');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('profiles');
}
