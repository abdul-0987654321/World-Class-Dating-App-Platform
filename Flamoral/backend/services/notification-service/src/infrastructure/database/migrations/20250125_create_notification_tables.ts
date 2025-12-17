import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Notification Templates table
  await knex.schema.createTable('notification_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.string('type', 50).notNullable(); // push, email, sms
    table.string('category', 50).notNullable(); // match, message, like, system, marketing
    table.string('subject', 255);
    table.text('title');
    table.text('body').notNullable();
    table.text('html_body');
    table.jsonb('variables').defaultTo('[]'); // Available template variables
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // User Devices table (for push notifications)
  await knex.schema.createTable('user_devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('device_token', 500).notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.string('device_id', 255);
    table.string('device_model', 100);
    table.string('os_version', 50);
    table.string('app_version', 50);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_active_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('device_token');
    table.unique(['user_id', 'device_token']);
  });

  // Notification Preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique();

    // Push notification preferences
    table.boolean('push_enabled').defaultTo(true);
    table.boolean('push_new_match').defaultTo(true);
    table.boolean('push_new_message').defaultTo(true);
    table.boolean('push_new_like').defaultTo(true);
    table.boolean('push_super_like').defaultTo(true);
    table.boolean('push_profile_view').defaultTo(false);
    table.boolean('push_boost_expiring').defaultTo(true);
    table.boolean('push_marketing').defaultTo(false);

    // Email notification preferences
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('email_new_match').defaultTo(true);
    table.boolean('email_new_message').defaultTo(true);
    table.boolean('email_weekly_digest').defaultTo(true);
    table.boolean('email_promotions').defaultTo(false);
    table.boolean('email_product_updates').defaultTo(true);

    // SMS notification preferences
    table.boolean('sms_enabled').defaultTo(false);
    table.boolean('sms_verification').defaultTo(true);
    table.boolean('sms_security_alerts').defaultTo(true);

    // Quiet hours
    table.boolean('quiet_hours_enabled').defaultTo(false);
    table.time('quiet_hours_start').defaultTo('22:00');
    table.time('quiet_hours_end').defaultTo('08:00');
    table.string('timezone', 50).defaultTo('UTC');

    table.timestamps(true, true);

    table.index('user_id');
  });

  // Notifications table (notification history)
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('template_id').references('id').inTable('notification_templates');
    table.enum('type', ['push', 'email', 'sms']).notNullable();
    table.enum('category', ['match', 'message', 'like', 'super_like', 'profile_view', 'boost', 'system', 'marketing', 'security']).notNullable();
    table.string('title', 255);
    table.text('body').notNullable();
    table.jsonb('data').defaultTo('{}'); // Additional payload data
    table.string('action_url', 500);
    table.string('image_url', 500);
    table.enum('status', ['pending', 'sent', 'delivered', 'failed', 'read']).defaultTo('pending');
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('scheduled_at');
    table.timestamp('sent_at');
    table.timestamp('delivered_at');
    table.timestamp('read_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
    table.index('category');
    table.index('created_at');
    table.index(['user_id', 'status']);
  });

  // Email Queue table
  await knex.schema.createTable('email_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('notification_id').references('id').inTable('notifications');
    table.uuid('user_id').notNullable();
    table.string('to_email', 255).notNullable();
    table.string('from_email', 255).defaultTo('noreply@flamoral.com');
    table.string('from_name', 100).defaultTo('Flamoral');
    table.string('subject', 255).notNullable();
    table.text('text_body');
    table.text('html_body');
    table.jsonb('attachments').defaultTo('[]');
    table.enum('status', ['queued', 'processing', 'sent', 'failed', 'bounced']).defaultTo('queued');
    table.string('message_id', 255);
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('scheduled_at');
    table.timestamp('sent_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
    table.index('scheduled_at');
  });

  // SMS Queue table
  await knex.schema.createTable('sms_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('notification_id').references('id').inTable('notifications');
    table.uuid('user_id').notNullable();
    table.string('to_phone', 20).notNullable();
    table.string('from_phone', 20);
    table.text('message').notNullable();
    table.enum('status', ['queued', 'processing', 'sent', 'delivered', 'failed']).defaultTo('queued');
    table.string('external_id', 100);
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('sent_at');
    table.timestamp('delivered_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
  });

  // Insert default notification templates
  await knex('notification_templates').insert([
    {
      name: 'new_match',
      type: 'push',
      category: 'match',
      title: "It's a Match! 🎉",
      body: 'You and {{match_name}} liked each other!',
      variables: JSON.stringify(['match_name', 'match_photo_url']),
    },
    {
      name: 'new_message',
      type: 'push',
      category: 'message',
      title: '{{sender_name}}',
      body: '{{message_preview}}',
      variables: JSON.stringify(['sender_name', 'message_preview', 'sender_photo_url']),
    },
    {
      name: 'new_like',
      type: 'push',
      category: 'like',
      title: 'Someone likes you! 💕',
      body: 'Someone liked your profile. Upgrade to see who!',
      variables: JSON.stringify([]),
    },
    {
      name: 'new_super_like',
      type: 'push',
      category: 'super_like',
      title: 'You got a Super Like! ⭐',
      body: '{{liker_name}} super liked you!',
      variables: JSON.stringify(['liker_name', 'liker_photo_url']),
    },
    {
      name: 'boost_expiring',
      type: 'push',
      category: 'boost',
      title: 'Your Boost is expiring soon',
      body: 'Your profile boost expires in {{minutes}} minutes',
      variables: JSON.stringify(['minutes']),
    },
    {
      name: 'welcome_email',
      type: 'email',
      category: 'system',
      subject: 'Welcome to Flamoral! 💝',
      title: 'Welcome to Flamoral',
      body: 'Hi {{first_name}}, welcome to Flamoral! Start swiping to find your match.',
      html_body: '<h1>Welcome to Flamoral!</h1><p>Hi {{first_name}},</p><p>Welcome to Flamoral! Start swiping to find your match.</p>',
      variables: JSON.stringify(['first_name']),
    },
    {
      name: 'weekly_digest',
      type: 'email',
      category: 'marketing',
      subject: 'Your Weekly Dating Digest 📊',
      title: 'Your Weekly Digest',
      body: 'Hi {{first_name}}, here is your activity summary: {{likes_count}} likes, {{matches_count}} matches this week!',
      variables: JSON.stringify(['first_name', 'likes_count', 'matches_count', 'messages_count']),
    },
    {
      name: 'verification_code',
      type: 'sms',
      category: 'security',
      title: 'Verification Code',
      body: 'Your Flamoral verification code is: {{code}}. Valid for 10 minutes.',
      variables: JSON.stringify(['code']),
    },
    {
      name: 'security_alert',
      type: 'sms',
      category: 'security',
      title: 'Security Alert',
      body: 'New login to your Flamoral account from {{device}}. If this wasn\'t you, secure your account.',
      variables: JSON.stringify(['device', 'location']),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sms_queue');
  await knex.schema.dropTableIfExists('email_queue');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('user_devices');
  await knex.schema.dropTableIfExists('notification_templates');
}
