import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('profiles', (table) => {
    // Lifestyle fields
    table.enum('smoking', ['never', 'sometimes', 'regularly']).nullable();
    table.enum('drinking', ['never', 'socially', 'regularly']).nullable();
    table.enum('exercise', ['never', 'sometimes', 'regularly', 'daily']).nullable();
    table.enum('diet', ['anything', 'vegetarian', 'vegan', 'halal', 'kosher', 'other']).nullable();
    table.enum('pets', ['none', 'dog', 'cat', 'both', 'other']).nullable();

    // Additional profile fields
    table.string('relationship_type', 50).nullable(); // 'casual', 'serious', 'friendship', 'unsure'
    table.boolean('has_children').defaultTo(false);
    table.boolean('wants_children').nullable();
    table.string('zodiac_sign', 20).nullable();
    table.string('religion', 50).nullable();
    table.string('politics', 50).nullable();

    // Profile completion
    table.integer('profile_completion_percentage').defaultTo(0);
    table.boolean('profile_completed').defaultTo(false);

    // Activity tracking
    table.timestamp('last_active_at').nullable();
    table.integer('view_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('profiles', (table) => {
    table.dropColumn('smoking');
    table.dropColumn('drinking');
    table.dropColumn('exercise');
    table.dropColumn('diet');
    table.dropColumn('pets');
    table.dropColumn('relationship_type');
    table.dropColumn('has_children');
    table.dropColumn('wants_children');
    table.dropColumn('zodiac_sign');
    table.dropColumn('religion');
    table.dropColumn('politics');
    table.dropColumn('profile_completion_percentage');
    table.dropColumn('profile_completed');
    table.dropColumn('last_active_at');
    table.dropColumn('view_count');
    table.dropColumn('like_count');
  });
}
