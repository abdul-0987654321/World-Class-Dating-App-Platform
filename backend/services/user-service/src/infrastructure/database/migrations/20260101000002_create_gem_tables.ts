import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Gems table - stores user gem balances
  await knex.schema.createTable('gems', (table) => {
    table.uuid('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.integer('balance').notNullable().defaultTo(0);
    table.integer('total_earned').notNullable().defaultTo(0);
    table.integer('total_spent').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
  });

  // Gem transactions table - audit trail for all gem changes
  await knex.schema.createTable('gem_transactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('amount').notNullable(); // Positive for credits, negative for debits
    table.enum('type', ['earned', 'spent', 'purchased', 'bonus', 'refund']).notNullable();
    table
      .enum('category', ['visibility', 'profile', 'communication', 'insights', 'matching', 'gifts'])
      .nullable();
    table.string('item_type', 50).nullable(); // e.g., PROFILE_SPOTLIGHT_24H
    table.string('description', 255).notNullable();
    table.jsonb('metadata').nullable(); // Additional context (achievement ID, recipient ID for gifts, etc.)
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('type');
    table.index('category');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
  });

  // Active features table - tracks time-limited features purchased with gems
  await knex.schema.createTable('gem_active_features', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('feature_type', 50).notNullable(); // e.g., PRIORITY_QUEUE_24H
    table.timestamp('activated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('transaction_id').nullable().references('id').inTable('gem_transactions');
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('feature_type');
    table.index('expires_at');
    table.index('is_active');
    table.index(['user_id', 'feature_type', 'is_active']);
  });

  // Virtual gifts table - tracks gifts sent between users
  await knex.schema.createTable('gem_gifts', (table) => {
    table.uuid('id').primary();
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .enum('gift_type', ['GIFT_ROSE', 'GIFT_HEART', 'GIFT_DIAMOND', 'GIFT_CROWN'])
      .notNullable();
    table.integer('gem_cost').notNullable();
    table.string('message', 500).nullable();
    table.uuid('transaction_id').nullable().references('id').inTable('gem_transactions');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('sender_id');
    table.index('recipient_id');
    table.index('gift_type');
    table.index('is_read');
    table.index(['recipient_id', 'is_read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gem_gifts');
  await knex.schema.dropTableIfExists('gem_active_features');
  await knex.schema.dropTableIfExists('gem_transactions');
  await knex.schema.dropTableIfExists('gems');
}
