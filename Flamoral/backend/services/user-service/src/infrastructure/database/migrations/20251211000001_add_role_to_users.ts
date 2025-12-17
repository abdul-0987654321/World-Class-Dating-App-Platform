import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('users', (table) => {
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user').notNullable();
    table.index('role');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('users', (table) => {
    table.dropColumn('role');
  });
}
