import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('opening_moves', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['text', 'image', 'system']).notNullable();
    table.text('content'); // For text-based opening moves
    table.string('image_url', 500); // For image-based opening moves
    table.uuid('template_id').references('id').inTable('opening_move_templates').onDelete('SET NULL');
    table.integer('order').notNullable().defaultTo(0); // Display order (0, 1, 2)
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'active']);
    table.index('template_id');
    table.index(['user_id', 'order']);

    // Ensure content or image_url is provided
    table.check(`
      (type = 'text' AND content IS NOT NULL) OR
      (type = 'image' AND image_url IS NOT NULL) OR
      (type = 'system' AND template_id IS NOT NULL)
    `);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('opening_moves');
}
