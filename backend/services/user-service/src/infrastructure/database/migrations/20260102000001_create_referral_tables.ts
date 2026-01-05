import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create referral_codes table
  await knex.schema.createTable('referral_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 8).notNullable().unique();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('max_uses').notNullable().defaultTo(10);
    table.integer('current_uses').notNullable().defaultTo(0);
    table.timestamp('expires_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('code');
    table.index('user_id');
    table.index('is_active');
    table.index(['user_id', 'is_active']);

    // Check constraint: current_uses cannot exceed max_uses
    table.check('current_uses <= max_uses', [], 'referral_codes_uses_check');
    table.check('current_uses >= 0', [], 'referral_codes_current_uses_non_negative');
    table.check('max_uses > 0', [], 'referral_codes_max_uses_positive');
  });

  // Create referrals table
  await knex.schema.createTable('referrals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referrer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('referred_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('referral_code_id')
      .notNullable()
      .references('id')
      .inTable('referral_codes')
      .onDelete('CASCADE');
    table.string('code', 8).notNullable(); // Denormalized for easy lookup
    table
      .enum('status', ['pending', 'completed', 'rewarded', 'expired', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    table.timestamp('referrer_rewarded_at').nullable();
    table.timestamp('referred_rewarded_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('referrer_id');
    table.index('referred_id');
    table.index('referral_code_id');
    table.index('code');
    table.index('status');
    table.index(['referrer_id', 'status']);
    table.index(['referred_id', 'status']);

    // Unique constraint: a user can only be referred once
    table.unique(['referred_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('referral_codes');
}
