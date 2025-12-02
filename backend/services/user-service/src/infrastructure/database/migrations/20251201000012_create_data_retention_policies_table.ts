import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('data_retention_policies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('data_type', [
      'user_profile',
      'messages',
      'photos',
      'swipes',
      'matches',
      'login_attempts',
      'access_logs',
      'deleted_accounts',
      'payment_records',
    ]).notNullable().unique();
    table.integer('retention_days').notNullable(); // How many days to retain
    table.boolean('applies_after_deletion').defaultTo(false); // Retain after user deletion
    table.text('legal_basis'); // GDPR legal basis for retention
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('data_type');
  });

  // Insert default policies
  return knex('data_retention_policies').insert([
    {
      data_type: 'user_profile',
      retention_days: 730, // 2 years after deletion
      applies_after_deletion: true,
      legal_basis: 'Legal obligation and legitimate interest',
      description: 'User profile data retained for fraud prevention and legal compliance',
    },
    {
      data_type: 'messages',
      retention_days: 365, // 1 year
      applies_after_deletion: false,
      legal_basis: 'User consent',
      description: 'Message history retained while account is active',
    },
    {
      data_type: 'photos',
      retention_days: 90, // 3 months after deletion
      applies_after_deletion: true,
      legal_basis: 'Legal obligation',
      description: 'Photos retained for moderation and safety verification',
    },
    {
      data_type: 'login_attempts',
      retention_days: 90, // 3 months
      applies_after_deletion: false,
      legal_basis: 'Legitimate interest (security)',
      description: 'Login attempts retained for security monitoring',
    },
    {
      data_type: 'payment_records',
      retention_days: 2555, // 7 years for tax/legal compliance
      applies_after_deletion: true,
      legal_basis: 'Legal obligation',
      description: 'Payment records retained for tax and financial compliance',
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('data_retention_policies');
}
