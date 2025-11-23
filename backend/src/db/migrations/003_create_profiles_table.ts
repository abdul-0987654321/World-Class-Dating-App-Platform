import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.text('bio');
    table.string('occupation');
    table.string('education');
    table.integer('height'); // cm
    table.string('relationship_goal');
    table.string('sexual_orientation');
    table.jsonb('interests').defaultTo('[]');
    table.jsonb('languages').defaultTo('[]');
    table.string('hometown');
    table.string('current_city');
    table.string('zodiac_sign');
    table.string('religion');
    table.string('politics');
    table.enum('smoking', ['never', 'sometimes', 'regularly', 'prefer_not_to_say']);
    table.enum('drinking', ['never', 'sometimes', 'regularly', 'prefer_not_to_say']);
    table.enum('exercise', ['never', 'sometimes', 'regularly', 'prefer_not_to_say']);
    table.jsonb('pets').defaultTo('[]');
    table.jsonb('looking_for').defaultTo('[]');
    table.jsonb('personality_traits').defaultTo('[]');
    table.integer('profile_completion_percentage').defaultTo(0);
    table.timestamps(true, true);

    table.index('user_id');
  });

  await knex.schema.createTable('profile_photos', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('url').notNullable();
    table.string('thumbnail_url');
    table.integer('order_index').notNullable().defaultTo(0);
    table.boolean('is_verified').defaultTo(false);
    table.enum('moderation_status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.text('moderation_notes');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('moderation_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('profile_photos');
  await knex.schema.dropTable('profiles');
}
