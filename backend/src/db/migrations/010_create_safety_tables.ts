import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Identity Verification Tables
  await knex.schema.createTable('identity_verifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', [
      'government_id',
      'selfie',
      'liveness',
      'video',
      'social_media',
      'phone',
      'email',
      'biometric'
    ]).notNullable();
    table.enum('status', ['pending', 'in_review', 'verified', 'rejected', 'expired']).defaultTo('pending');
    table.string('provider'); // External verification provider (e.g., Onfido, Jumio)
    table.string('provider_reference_id');
    table.jsonb('verification_data'); // Encrypted verification details
    table.jsonb('metadata'); // Additional metadata
    table.text('rejection_reason');
    table.timestamp('verified_at');
    table.timestamp('expires_at');
    table.timestamps(true, true);

    table.index(['user_id', 'type']);
    table.index('status');
    table.index('provider_reference_id');
  });

  await knex.schema.createTable('verification_documents', (table) => {
    table.uuid('id').primary();
    table.uuid('verification_id').notNullable().references('id').inTable('identity_verifications').onDelete('CASCADE');
    table.enum('document_type', [
      'passport',
      'drivers_license',
      'national_id',
      'selfie_photo',
      'selfie_video',
      'liveness_video',
      'proof_of_address'
    ]).notNullable();
    table.string('storage_path').notNullable(); // Encrypted file storage path
    table.string('file_hash'); // For integrity verification
    table.boolean('is_processed').defaultTo(false);
    table.jsonb('ai_analysis'); // AI photo/document analysis results
    table.timestamps(true, true);

    table.index('verification_id');
  });

  await knex.schema.createTable('social_verifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('provider', ['facebook', 'instagram', 'twitter', 'linkedin', 'google', 'apple']).notNullable();
    table.string('provider_user_id').notNullable();
    table.string('provider_username');
    table.jsonb('profile_data'); // Basic profile info
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at');
    table.timestamps(true, true);

    table.unique(['user_id', 'provider']);
    table.index('provider_user_id');
  });

  // Account Security Tables
  await knex.schema.createTable('user_security_settings', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    table.boolean('two_factor_enabled').defaultTo(false);
    table.enum('two_factor_method', ['sms', 'authenticator', 'email', 'biometric']);
    table.string('two_factor_secret'); // Encrypted TOTP secret
    table.text('backup_codes'); // Encrypted backup codes
    table.boolean('login_alerts_enabled').defaultTo(true);
    table.boolean('new_device_alerts_enabled').defaultTo(true);
    table.boolean('suspicious_activity_alerts_enabled').defaultTo(true);
    table.jsonb('allowed_login_locations'); // Geofenced login areas
    table.jsonb('trusted_devices'); // Device fingerprints
    table.integer('max_sessions').defaultTo(5);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('login_attempts', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('email');
    table.string('ip_address').notNullable();
    table.string('user_agent');
    table.string('device_fingerprint');
    table.jsonb('geolocation'); // City, country, etc.
    table.boolean('was_successful').notNullable();
    table.enum('failure_reason', [
      'invalid_password',
      'account_locked',
      'account_banned',
      '2fa_failed',
      'suspicious_activity',
      'geofence_violation'
    ]);
    table.boolean('is_suspicious').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('email');
    table.index('ip_address');
    table.index('created_at');
  });

  await knex.schema.createTable('active_sessions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_token').notNullable().unique();
    table.string('device_fingerprint');
    table.string('device_name');
    table.enum('device_type', ['mobile', 'tablet', 'desktop', 'unknown']).defaultTo('unknown');
    table.string('browser');
    table.string('os');
    table.string('ip_address');
    table.jsonb('geolocation');
    table.boolean('is_current').defaultTo(false);
    table.timestamp('last_active_at');
    table.timestamp('expires_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('session_token');
    table.index('expires_at');
  });

  await knex.schema.createTable('account_recovery_methods', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['email', 'phone', 'security_questions', 'trusted_contact']).notNullable();
    table.string('value'); // Email, phone, or contact ID (encrypted)
    table.jsonb('security_questions'); // Encrypted Q&A pairs
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_primary').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
  });

  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.string('ip_address');
    table.timestamps(true, true);

    table.index('token_hash');
    table.index('user_id');
    table.index('expires_at');
  });

  // Data Privacy Tables
  await knex.schema.createTable('user_privacy_settings', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    table.enum('profile_visibility', ['public', 'matches_only', 'hidden']).defaultTo('public');
    table.boolean('show_online_status').defaultTo(true);
    table.boolean('show_last_active').defaultTo(true);
    table.boolean('show_distance').defaultTo(true);
    table.boolean('show_age').defaultTo(true);
    table.boolean('allow_screenshot').defaultTo(false);
    table.boolean('blur_photos_for_non_matches').defaultTo(false);
    table.boolean('incognito_mode').defaultTo(false);
    table.jsonb('hidden_from_users'); // Array of user IDs
    table.jsonb('blocked_contacts'); // Phone contacts to hide from
    table.boolean('data_collection_consent').defaultTo(true);
    table.boolean('personalization_consent').defaultTo(true);
    table.boolean('marketing_consent').defaultTo(false);
    table.boolean('third_party_sharing_consent').defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('data_export_requests', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'processing', 'ready', 'downloaded', 'expired', 'failed']).defaultTo('pending');
    table.enum('format', ['json', 'csv', 'pdf']).defaultTo('json');
    table.string('download_url');
    table.string('download_token_hash');
    table.timestamp('ready_at');
    table.timestamp('expires_at');
    table.timestamp('downloaded_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
  });

  await knex.schema.createTable('data_deletion_requests', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['full_deletion', 'anonymization', 'selective']).notNullable();
    table.jsonb('selective_data'); // If selective, what to delete
    table.enum('status', ['pending', 'processing', 'completed', 'cancelled']).defaultTo('pending');
    table.text('reason');
    table.timestamp('scheduled_at'); // 30-day waiting period
    table.timestamp('completed_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
    table.index('scheduled_at');
  });

  await knex.schema.createTable('consent_records', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('consent_type').notNullable(); // Terms, privacy, marketing, etc.
    table.string('version').notNullable(); // Policy version
    table.boolean('consented').notNullable();
    table.string('ip_address');
    table.string('user_agent');
    table.timestamps(true, true);

    table.index(['user_id', 'consent_type']);
    table.index('created_at');
  });

  // Harassment Prevention Tables
  await knex.schema.createTable('user_blocks', (table) => {
    table.uuid('id').primary();
    table.uuid('blocker_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('reason');
    table.enum('block_type', ['full', 'messages_only', 'profile_only']).defaultTo('full');
    table.timestamps(true, true);

    table.unique(['blocker_id', 'blocked_id']);
    table.index('blocker_id');
    table.index('blocked_id');
  });

  await knex.schema.createTable('user_reports', (table) => {
    table.uuid('id').primary();
    table.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reported_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('category', [
      'harassment',
      'spam',
      'fake_profile',
      'inappropriate_content',
      'scam',
      'underage',
      'threatening_behavior',
      'hate_speech',
      'sexual_harassment',
      'stalking',
      'other'
    ]).notNullable();
    table.text('description');
    table.jsonb('evidence'); // Screenshot URLs, message IDs
    table.uuid('reported_content_id'); // Optional: specific content ID
    table.enum('reported_content_type', ['profile', 'photo', 'message', 'comment']);
    table.enum('status', ['pending', 'under_review', 'resolved', 'dismissed', 'escalated']).defaultTo('pending');
    table.enum('resolution', ['warning', 'content_removed', 'account_suspended', 'account_banned', 'no_action']);
    table.uuid('reviewed_by'); // Moderator ID
    table.text('review_notes');
    table.timestamp('reviewed_at');
    table.timestamps(true, true);

    table.index('reporter_id');
    table.index('reported_user_id');
    table.index('status');
    table.index('category');
    table.index('created_at');
  });

  await knex.schema.createTable('content_moderation_queue', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('content_type', ['photo', 'bio', 'message', 'profile', 'comment']).notNullable();
    table.uuid('content_id').notNullable();
    table.enum('moderation_type', ['auto', 'manual', 'appeal']).defaultTo('auto');
    table.enum('status', ['pending', 'approved', 'rejected', 'escalated']).defaultTo('pending');
    table.jsonb('ai_analysis'); // AI moderation results
    table.float('ai_confidence_score');
    table.jsonb('flags'); // Array of detected issues
    table.uuid('moderator_id');
    table.text('moderator_notes');
    table.timestamp('reviewed_at');
    table.timestamps(true, true);

    table.index(['user_id', 'content_type']);
    table.index('status');
    table.index('moderation_type');
  });

  await knex.schema.createTable('message_filters', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('filter_explicit_content').defaultTo(true);
    table.boolean('filter_spam').defaultTo(true);
    table.boolean('filter_solicitation').defaultTo(true);
    table.boolean('allow_message_requests').defaultTo(true);
    table.boolean('require_match_to_message').defaultTo(true);
    table.jsonb('keyword_filters'); // Custom blocked words
    table.timestamps(true, true);

    table.unique('user_id');
  });

  // Physical Safety Tables
  await knex.schema.createTable('emergency_contacts', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('phone').notNullable();
    table.string('email');
    table.enum('relationship', ['parent', 'sibling', 'friend', 'spouse', 'other']).notNullable();
    table.boolean('is_primary').defaultTo(false);
    table.boolean('can_receive_alerts').defaultTo(true);
    table.boolean('can_see_location').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
  });

  await knex.schema.createTable('safety_check_ins', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('match_id'); // Who they're meeting
    table.string('location_name');
    table.jsonb('coordinates'); // lat, lng
    table.timestamp('scheduled_time').notNullable();
    table.timestamp('expected_end_time');
    table.enum('status', ['scheduled', 'active', 'completed', 'missed', 'emergency']).defaultTo('scheduled');
    table.text('notes');
    table.boolean('alert_sent').defaultTo(false);
    table.timestamp('last_check_in_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
    table.index('scheduled_time');
  });

  await knex.schema.createTable('location_shares', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('shared_with_user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('emergency_contact_id').references('id').inTable('emergency_contacts').onDelete('CASCADE');
    table.jsonb('current_location'); // lat, lng, accuracy
    table.enum('share_type', ['live', 'one_time', 'date_share']).defaultTo('live');
    table.timestamp('expires_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('shared_with_user_id');
    table.index('is_active');
  });

  // Financial Protection Tables
  await knex.schema.createTable('scam_indicators', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('indicator_type', [
      'money_request',
      'external_link',
      'crypto_mention',
      'gift_card_mention',
      'wire_transfer_mention',
      'rapid_relationship_escalation',
      'inconsistent_profile',
      'refusal_to_meet',
      'sob_story',
      'investment_opportunity'
    ]).notNullable();
    table.text('content_excerpt'); // What triggered the indicator
    table.uuid('message_id'); // Related message if applicable
    table.float('confidence_score');
    table.enum('status', ['detected', 'reviewed', 'confirmed', 'false_positive']).defaultTo('detected');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('indicator_type');
    table.index('status');
  });

  await knex.schema.createTable('fraud_alerts', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('alert_type', [
      'potential_scam',
      'suspicious_profile',
      'payment_fraud',
      'identity_theft',
      'romance_scam'
    ]).notNullable();
    table.text('description');
    table.jsonb('evidence');
    table.boolean('was_shown_to_user').defaultTo(false);
    table.boolean('user_acknowledged').defaultTo(false);
    table.timestamp('acknowledged_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('alert_type');
  });

  // Platform Integrity Tables
  await knex.schema.createTable('bot_detection_scores', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    table.float('overall_score').defaultTo(0); // 0-100, higher = more likely bot
    table.jsonb('behavioral_signals'); // Typing speed, navigation patterns, etc.
    table.jsonb('profile_signals'); // Photo analysis, bio patterns, etc.
    table.jsonb('interaction_signals'); // Message patterns, match behavior, etc.
    table.timestamp('last_calculated_at');
    table.timestamps(true, true);

    table.index('overall_score');
  });

  await knex.schema.createTable('user_behavior_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('action_type', [
      'swipe_left',
      'swipe_right',
      'super_like',
      'message_sent',
      'photo_viewed',
      'profile_viewed',
      'profile_edited',
      'report_submitted',
      'block_added',
      'match_unmatched'
    ]).notNullable();
    table.uuid('target_id'); // User ID or content ID
    table.jsonb('metadata');
    table.string('device_fingerprint');
    table.string('ip_address');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('action_type');
    table.index('created_at');
  });

  await knex.schema.createTable('account_flags', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('flag_type', [
      'suspicious_activity',
      'multiple_reports',
      'bot_behavior',
      'spam_behavior',
      'scam_behavior',
      'ban_evasion',
      'fake_profile',
      'underage_suspected',
      'identity_mismatch'
    ]).notNullable();
    table.text('reason');
    table.jsonb('evidence');
    table.enum('status', ['active', 'resolved', 'escalated']).defaultTo('active');
    table.uuid('created_by'); // System or moderator ID
    table.uuid('resolved_by');
    table.text('resolution_notes');
    table.timestamp('resolved_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('flag_type');
    table.index('status');
  });

  await knex.schema.createTable('moderation_actions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('moderator_id').references('id').inTable('users').onDelete('SET NULL');
    table.enum('action_type', [
      'warning',
      'content_removal',
      'temporary_suspension',
      'permanent_ban',
      'shadow_ban',
      'feature_restriction',
      'verification_required',
      'appeal_approved',
      'appeal_denied'
    ]).notNullable();
    table.text('reason');
    table.jsonb('related_reports'); // Report IDs
    table.timestamp('expires_at'); // For temporary actions
    table.boolean('is_active').defaultTo(true);
    table.boolean('was_appealed').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('action_type');
    table.index('is_active');
  });

  await knex.schema.createTable('ban_appeals', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('moderation_action_id').notNullable().references('id').inTable('moderation_actions').onDelete('CASCADE');
    table.text('appeal_reason').notNullable();
    table.jsonb('supporting_evidence');
    table.enum('status', ['pending', 'under_review', 'approved', 'denied']).defaultTo('pending');
    table.uuid('reviewed_by');
    table.text('review_notes');
    table.timestamp('reviewed_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('status');
  });

  // Vulnerable Population Protection
  await knex.schema.createTable('age_verification_checks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('method', ['id_verification', 'credit_card', 'phone', 'social_media', 'ai_estimate']).notNullable();
    table.date('verified_date_of_birth');
    table.integer('estimated_age_min');
    table.integer('estimated_age_max');
    table.float('confidence_score');
    table.boolean('passed').defaultTo(false);
    table.jsonb('verification_details');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('passed');
  });

  await knex.schema.createTable('wellbeing_signals', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('signal_type', [
      'distress_language',
      'self_harm_mention',
      'crisis_keywords',
      'harassment_victim',
      'exploitation_concern',
      'isolation_pattern'
    ]).notNullable();
    table.text('content_excerpt');
    table.float('confidence_score');
    table.enum('status', ['detected', 'resources_shown', 'dismissed', 'reported']).defaultTo('detected');
    table.boolean('resources_provided').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('signal_type');
  });

  await knex.schema.createTable('crisis_resources_shown', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('wellbeing_signal_id').references('id').inTable('wellbeing_signals').onDelete('SET NULL');
    table.enum('resource_type', [
      'suicide_hotline',
      'crisis_text_line',
      'domestic_violence',
      'sexual_assault',
      'mental_health',
      'human_trafficking',
      'general_helpline'
    ]).notNullable();
    table.string('resource_country');
    table.string('resource_name');
    table.string('resource_contact');
    table.boolean('was_clicked').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('crisis_resources_shown');
  await knex.schema.dropTableIfExists('wellbeing_signals');
  await knex.schema.dropTableIfExists('age_verification_checks');
  await knex.schema.dropTableIfExists('ban_appeals');
  await knex.schema.dropTableIfExists('moderation_actions');
  await knex.schema.dropTableIfExists('account_flags');
  await knex.schema.dropTableIfExists('user_behavior_logs');
  await knex.schema.dropTableIfExists('bot_detection_scores');
  await knex.schema.dropTableIfExists('fraud_alerts');
  await knex.schema.dropTableIfExists('scam_indicators');
  await knex.schema.dropTableIfExists('location_shares');
  await knex.schema.dropTableIfExists('safety_check_ins');
  await knex.schema.dropTableIfExists('emergency_contacts');
  await knex.schema.dropTableIfExists('message_filters');
  await knex.schema.dropTableIfExists('content_moderation_queue');
  await knex.schema.dropTableIfExists('user_reports');
  await knex.schema.dropTableIfExists('user_blocks');
  await knex.schema.dropTableIfExists('consent_records');
  await knex.schema.dropTableIfExists('data_deletion_requests');
  await knex.schema.dropTableIfExists('data_export_requests');
  await knex.schema.dropTableIfExists('user_privacy_settings');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('account_recovery_methods');
  await knex.schema.dropTableIfExists('active_sessions');
  await knex.schema.dropTableIfExists('login_attempts');
  await knex.schema.dropTableIfExists('user_security_settings');
  await knex.schema.dropTableIfExists('social_verifications');
  await knex.schema.dropTableIfExists('verification_documents');
  await knex.schema.dropTableIfExists('identity_verifications');
}
