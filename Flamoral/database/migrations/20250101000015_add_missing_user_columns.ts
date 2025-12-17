import { Knex } from 'knex';

/**
 * Migration: Add Missing Columns to Users and Profiles Tables
 * Description: Adds profile_image_url, coin_balance, phone, first_name, last_name to users table
 */
export async function up(knex: Knex): Promise<void> {
  // Add missing columns to users table
  await knex.schema.alterTable('users', (table) => {
    // Add profile_image_url to users table
    table.string('profile_image_url', 500).nullable();

    // Add coin_balance to users table (denormalized from coins table for quick access)
    table.integer('coin_balance').notNullable().defaultTo(0);

    // Add phone (alias for phone_number) - but phone_number already exists
    // We'll ensure the column exists and is properly named

    // Add first_name and last_name to users table (denormalized for quick access)
    table.string('first_name', 100).nullable();
    table.string('last_name', 100).nullable();

    // Add indexes
    table.index('profile_image_url');
    table.index('coin_balance');
  });

  // Sync coin_balance from coins table if data exists
  await knex.raw(`
    UPDATE users u
    SET coin_balance = COALESCE(c.balance, 0)
    FROM coins c
    WHERE u.id = c.user_id;
  `);

  // Sync first_name and last_name from profiles table if data exists
  await knex.raw(`
    UPDATE users u
    SET first_name = p.first_name,
        last_name = p.last_name
    FROM profiles p
    WHERE u.id = p.user_id;
  `);

  // Create trigger to keep coin_balance in sync
  await knex.raw(`
    CREATE OR REPLACE FUNCTION sync_user_coin_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users
      SET coin_balance = NEW.balance
      WHERE id = NEW.user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_sync_user_coin_balance
    AFTER UPDATE OF balance ON coins
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_coin_balance();
  `);

  // Create trigger to keep user names in sync
  await knex.raw(`
    CREATE OR REPLACE FUNCTION sync_user_names()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users
      SET first_name = NEW.first_name,
          last_name = NEW.last_name
      WHERE id = NEW.user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_sync_user_names
    AFTER INSERT OR UPDATE OF first_name, last_name ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_names();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS trigger_sync_user_names ON profiles');
  await knex.raw('DROP FUNCTION IF EXISTS sync_user_names');
  await knex.raw('DROP TRIGGER IF EXISTS trigger_sync_user_coin_balance ON coins');
  await knex.raw('DROP FUNCTION IF EXISTS sync_user_coin_balance');

  // Remove columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
    table.dropColumn('coin_balance');
    table.dropColumn('profile_image_url');
  });
}
