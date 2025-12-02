import { Knex } from 'knex';

/**
 * Migration: Create Notification Tables
 * Description: Push notifications, email, SMS, and notification preferences
 */
export async function up(knex: Knex): Promise<void> {
  // Create notification_templates table
  await knex.schema.createTable('notification_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.string('code', 50).notNullable().unique(); // Template code identifier
    table.enum('type', ['push', 'email', 'sms', 'in_app']).notNullable();
    table.enum('category', [
      'match',
      'message',
      'like',
      'super_like',
      'profile_view',
      'boost',
      'system',
      'marketing',
      'security'
    ]).notNullable();

    // Template content
    table.string('subject', 255).nullable(); // For email
    table.text('title').nullable();
    table.text('body').notNullable();
    table.text('html_body').nullable(); // For email

    // Template variables
    table.jsonb('variables').defaultTo('[]');

    // Template metadata
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('code');
    table.index('type');
    table.index('category');
    table.index('is_active');
  });

  // Create user_devices table (for push notifications)
  await knex.schema.createTable('user_devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Device information
    table.string('device_token', 500).notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.string('device_id', 255).nullable();
    table.string('device_model', 100).nullable();
    table.string('device_name', 100).nullable();
    table.string('os_version', 50).nullable();
    table.string('app_version', 50).nullable();

    // Push notification provider
    table.enum('push_provider', ['fcm', 'apns', 'web_push']).nullable();

    // Status
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_active_at').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('device_token');
    table.index('platform');
    table.index('is_active');
    table.unique(['user_id', 'device_token']);
  });

  // Create notification_preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

    // Push notification preferences
    table.boolean('push_enabled').defaultTo(true);
    table.boolean('push_new_match').defaultTo(true);
    table.boolean('push_new_message').defaultTo(true);
    table.boolean('push_new_like').defaultTo(true);
    table.boolean('push_super_like').defaultTo(true);
    table.boolean('push_profile_view').defaultTo(false);
    table.boolean('push_boost_expiring').defaultTo(true);
    table.boolean('push_boost_results').defaultTo(true);
    table.boolean('push_marketing').defaultTo(false);
    table.boolean('push_tips_suggestions').defaultTo(true);

    // Email notification preferences
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('email_new_match').defaultTo(true);
    table.boolean('email_new_message').defaultTo(true);
    table.boolean('email_weekly_digest').defaultTo(true);
    table.boolean('email_monthly_summary').defaultTo(true);
    table.boolean('email_promotions').defaultTo(false);
    table.boolean('email_product_updates').defaultTo(true);
    table.boolean('email_tips_advice').defaultTo(false);

    // SMS notification preferences
    table.boolean('sms_enabled').defaultTo(false);
    table.boolean('sms_verification').defaultTo(true);
    table.boolean('sms_security_alerts').defaultTo(true);
    table.boolean('sms_important_updates').defaultTo(false);

    // In-app notification preferences
    table.boolean('in_app_enabled').defaultTo(true);
    table.boolean('in_app_sound').defaultTo(true);
    table.boolean('in_app_vibration').defaultTo(true);

    // Quiet hours
    table.boolean('quiet_hours_enabled').defaultTo(false);
    table.time('quiet_hours_start').defaultTo('22:00');
    table.time('quiet_hours_end').defaultTo('08:00');
    table.string('timezone', 50).defaultTo('UTC');

    // Do Not Disturb mode
    table.boolean('dnd_enabled').defaultTo(false);
    table.timestamp('dnd_until').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
  });

  // Create notifications table (notification history)
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('template_id').nullable()
      .references('id').inTable('notification_templates');

    // Notification details
    table.enum('type', ['push', 'email', 'sms', 'in_app']).notNullable();
    table.enum('category', [
      'match',
      'message',
      'like',
      'super_like',
      'profile_view',
      'boost',
      'system',
      'marketing',
      'security'
    ]).notNullable();

    // Content
    table.string('title', 255).nullable();
    table.text('body').notNullable();
    table.jsonb('data').defaultTo('{}'); // Additional payload data

    // Actions
    table.string('action_url', 500).nullable();
    table.string('deep_link', 500).nullable();
    table.string('image_url', 500).nullable();

    // Status
    table.enum('status', [
      'pending',
      'queued',
      'sent',
      'delivered',
      'failed',
      'read',
      'clicked'
    ]).defaultTo('pending');

    table.enum('priority', ['low', 'normal', 'high', 'urgent'])
      .defaultTo('normal');

    // Error tracking
    table.text('error_message').nullable();
    table.integer('retry_count').defaultTo(0);

    // Timing
    table.timestamp('scheduled_at').nullable();
    table.timestamp('sent_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('read_at').nullable();
    table.timestamp('clicked_at').nullable();

    // Timestamps
    table.timestamps(true, true);
    table.timestamp('expires_at').nullable();

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('category');
    table.index('type');
    table.index('created_at');
    table.index(['user_id', 'status']);
    table.index(['user_id', 'created_at']);
  });

  // Seed default notification templates
  await knex('notification_templates').insert([
    {
      name: 'New Match',
      code: 'NEW_MATCH',
      type: 'push',
      category: 'match',
      title: "It's a Match! 🎉",
      body: 'You and {{match_name}} liked each other!',
      variables: JSON.stringify(['match_name', 'match_photo_url', 'match_id']),
    },
    {
      name: 'New Message',
      code: 'NEW_MESSAGE',
      type: 'push',
      category: 'message',
      title: '{{sender_name}}',
      body: '{{message_preview}}',
      variables: JSON.stringify(['sender_name', 'message_preview', 'sender_photo_url', 'conversation_id']),
    },
    {
      name: 'New Like',
      code: 'NEW_LIKE',
      type: 'push',
      category: 'like',
      title: 'Someone likes you! 💕',
      body: 'You have a new like! Upgrade to see who.',
      variables: JSON.stringify([]),
    },
    {
      name: 'New Super Like',
      code: 'NEW_SUPER_LIKE',
      type: 'push',
      category: 'super_like',
      title: 'You got a Super Like! ⭐',
      body: '{{liker_name}} super liked you!',
      variables: JSON.stringify(['liker_name', 'liker_photo_url', 'liker_id']),
    },
    {
      name: 'Boost Expiring',
      code: 'BOOST_EXPIRING',
      type: 'push',
      category: 'boost',
      title: 'Your Boost is expiring soon',
      body: 'Your profile boost expires in {{minutes}} minutes',
      variables: JSON.stringify(['minutes', 'boost_id']),
    },
    {
      name: 'Boost Results',
      code: 'BOOST_RESULTS',
      type: 'push',
      category: 'boost',
      title: 'Your Boost Results 📊',
      body: 'Your boost got you {{likes}} likes and {{matches}} matches!',
      variables: JSON.stringify(['likes', 'matches', 'profile_views']),
    },
    {
      name: 'Welcome Email',
      code: 'WELCOME_EMAIL',
      type: 'email',
      category: 'system',
      subject: 'Welcome to Flamoral! 💝',
      title: 'Welcome to Flamoral',
      body: 'Hi {{first_name}}, welcome to Flamoral! Start swiping to find your match.',
      html_body: '<h1>Welcome to Flamoral!</h1><p>Hi {{first_name}},</p><p>Welcome to Flamoral! Start swiping to find your match.</p>',
      variables: JSON.stringify(['first_name', 'profile_url']),
    },
    {
      name: 'Weekly Digest',
      code: 'WEEKLY_DIGEST',
      type: 'email',
      category: 'marketing',
      subject: 'Your Weekly Dating Digest 📊',
      title: 'Your Weekly Digest',
      body: 'Hi {{first_name}}, here is your activity summary: {{likes_count}} likes, {{matches_count}} matches this week!',
      variables: JSON.stringify(['first_name', 'likes_count', 'matches_count', 'messages_count', 'profile_views']),
    },
    {
      name: 'Verification Code SMS',
      code: 'VERIFICATION_CODE_SMS',
      type: 'sms',
      category: 'security',
      title: 'Verification Code',
      body: 'Your Flamoral verification code is: {{code}}. Valid for 10 minutes.',
      variables: JSON.stringify(['code']),
    },
    {
      name: 'Security Alert SMS',
      code: 'SECURITY_ALERT_SMS',
      type: 'sms',
      category: 'security',
      title: 'Security Alert',
      body: 'New login to your Flamoral account from {{device}}. If this wasn\'t you, secure your account immediately.',
      variables: JSON.stringify(['device', 'location', 'timestamp']),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('user_devices');
  await knex.schema.dropTableIfExists('notification_templates');
}
