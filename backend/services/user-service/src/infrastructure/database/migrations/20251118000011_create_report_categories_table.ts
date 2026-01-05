import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('report_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    table
      .enum('auto_action', ['none', 'flag', 'warn', 'suspend', 'ban'])
      .notNullable()
      .defaultTo('none');
    table.integer('suspension_duration_hours').nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.integer('display_order').notNullable().defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('code');
    table.index('active');
    table.index('severity');
  });

  // Seed default report categories
  await knex('report_categories').insert([
    {
      code: 'inappropriate_photos',
      name: 'Inappropriate Photos',
      description: 'Photos containing nudity, sexual content, or other inappropriate imagery',
      severity: 'high',
      auto_action: 'flag',
      display_order: 1,
      active: true,
    },
    {
      code: 'inappropriate_messages',
      name: 'Inappropriate Messages',
      description: 'Messages containing sexual, offensive, or harassing content',
      severity: 'medium',
      auto_action: 'flag',
      display_order: 2,
      active: true,
    },
    {
      code: 'fake_profile',
      name: 'Fake or Impersonation',
      description: 'Profile appears to be fake, stolen photos, or impersonating someone',
      severity: 'medium',
      auto_action: 'flag',
      display_order: 3,
      active: true,
    },
    {
      code: 'spam',
      name: 'Spam or Advertising',
      description: 'Sending spam, promotional content, or advertising',
      severity: 'low',
      auto_action: 'warn',
      display_order: 4,
      active: true,
    },
    {
      code: 'harassment',
      name: 'Harassment or Bullying',
      description: 'Repeated unwanted contact, bullying, or threatening behavior',
      severity: 'high',
      auto_action: 'suspend',
      suspension_duration_hours: 24,
      display_order: 5,
      active: true,
    },
    {
      code: 'underage',
      name: 'Underage User',
      description: 'User appears to be under 18 years old',
      severity: 'critical',
      auto_action: 'ban',
      display_order: 6,
      active: true,
    },
    {
      code: 'scam',
      name: 'Scam or Fraud',
      description: 'Attempting to scam, defraud, or solicit money',
      severity: 'high',
      auto_action: 'suspend',
      suspension_duration_hours: 72,
      display_order: 7,
      active: true,
    },
    {
      code: 'violence',
      name: 'Violence or Threats',
      description: 'Threatening violence or sharing violent content',
      severity: 'critical',
      auto_action: 'ban',
      display_order: 8,
      active: true,
    },
    {
      code: 'hate_speech',
      name: 'Hate Speech',
      description: 'Content promoting hate or discrimination',
      severity: 'critical',
      auto_action: 'ban',
      display_order: 9,
      active: true,
    },
    {
      code: 'other',
      name: 'Other',
      description: 'Other issues not covered by the categories above',
      severity: 'low',
      auto_action: 'flag',
      display_order: 10,
      active: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('report_categories');
}
