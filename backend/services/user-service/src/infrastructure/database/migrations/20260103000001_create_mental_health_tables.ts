import { Knex } from 'knex';

/**
 * Mental Health Check-ins Database Schema
 *
 * Privacy-first design with:
 * - Encrypted sensitive fields
 * - Limited retention (auto-delete after configurable period)
 * - Minimal data collection
 * - User-controlled data access
 */
export async function up(knex: Knex): Promise<void> {
  // Mental health check-ins table
  await knex.schema.createTable('mental_health_checkins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Mood data (1-10 scale)
    table.integer('mood_score').notNullable().checkBetween([1, 10]);
    table.integer('energy_level').checkBetween([1, 10]);
    table.integer('anxiety_level').checkBetween([1, 10]);
    table.integer('stress_level').checkBetween([1, 10]);
    table.integer('dating_confidence').checkBetween([1, 10]);
    table.integer('social_satisfaction').checkBetween([1, 10]);

    // Dating journey reflection
    table.text('reflection_notes_encrypted'); // Encrypted user notes
    table.specificType('feelings', 'text[]'); // Array of selected feelings
    table.specificType('dating_experiences', 'text[]'); // Recent dating experiences

    // Context
    table.enum('check_in_type', ['daily', 'weekly', 'prompted', 'manual']).defaultTo('manual');
    table.text('trigger_context'); // What triggered this check-in (optional)

    // Privacy metadata
    table.string('encryption_key_id', 64); // Reference to encryption key
    table.timestamp('auto_delete_at'); // When to auto-delete this record
    table.boolean('is_anonymized').defaultTo(false);

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('created_at');
    table.index('auto_delete_at');
    table.index(['user_id', 'check_in_type']);
  });

  // User wellness settings
  await knex.schema.createTable('wellness_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Check-in preferences
    table.boolean('daily_checkin_enabled').defaultTo(false);
    table.boolean('weekly_checkin_enabled').defaultTo(true);
    table.string('preferred_checkin_time', 5).defaultTo('20:00'); // HH:MM format
    table.string('timezone', 50).defaultTo('UTC');
    table.specificType('checkin_days', 'integer[]').defaultTo('{1,2,3,4,5,6,7}'); // Days of week

    // Notification preferences
    table.boolean('reminder_notifications').defaultTo(true);
    table.boolean('affirmation_notifications').defaultTo(true);
    table.boolean('resource_suggestions').defaultTo(true);
    table.boolean('crisis_detection_enabled').defaultTo(true);

    // Break preferences
    table.boolean('suggest_breaks').defaultTo(true);
    table.integer('break_suggestion_threshold').defaultTo(3); // After X low scores

    // Privacy settings
    table.integer('data_retention_days').defaultTo(90); // Auto-delete after X days
    table.boolean('share_anonymous_stats').defaultTo(false); // Contribute to anonymized research

    // Mental health break status
    table.boolean('is_on_break').defaultTo(false);
    table.timestamp('break_started_at');
    table.timestamp('break_ends_at');
    table.text('break_reason'); // Optional user-provided reason

    table.timestamps(true, true);
  });

  // Distress detection logs (privacy-focused - stores minimal data)
  await knex.schema.createTable('distress_detection_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Detection data
    table
      .enum('detection_type', [
        'low_mood_trend',
        'high_anxiety',
        'rapid_decline',
        'usage_pattern_change',
        'rejection_accumulation',
        'social_withdrawal',
        'crisis_keywords',
        'user_reported',
      ])
      .notNullable();

    table.float('confidence_score').checkBetween([0, 1]); // 0-1 confidence
    table.integer('severity_level').checkBetween([1, 5]); // 1=low, 5=critical

    // Action taken
    table
      .enum('action_taken', [
        'none',
        'resources_shown',
        'break_suggested',
        'notification_sent',
        'crisis_resources_shown',
        'user_acknowledged',
      ])
      .defaultTo('none');

    table.boolean('user_dismissed').defaultTo(false);
    table.timestamp('user_acknowledged_at');

    // Privacy
    table.timestamp('auto_delete_at');

    table.timestamps(true, true);

    table.index('user_id');
    table.index('created_at');
    table.index('detection_type');
    table.index('auto_delete_at');
  });

  // Wellness resources
  await knex.schema.createTable('wellness_resources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.text('url');
    table.string('phone_number', 30); // For crisis hotlines

    table
      .enum('category', [
        'crisis_support',
        'anxiety_management',
        'dating_stress',
        'self_esteem',
        'rejection_coping',
        'loneliness',
        'relationship_anxiety',
        'general_wellness',
        'professional_help',
        'peer_support',
      ])
      .notNullable();

    table
      .enum('resource_type', [
        'hotline',
        'article',
        'video',
        'app',
        'professional_service',
        'community',
        'exercise',
        'meditation',
      ])
      .notNullable();

    table.integer('priority').defaultTo(100); // Lower = higher priority
    table.specificType('available_countries', 'text[]'); // Empty = worldwide
    table.specificType('languages', 'text[]').defaultTo('{en}');

    table.boolean('is_crisis_resource').defaultTo(false);
    table.boolean('is_active').defaultTo(true);

    table.timestamps(true, true);

    table.index('category');
    table.index('is_crisis_resource');
    table.index('is_active');
  });

  // Positive affirmations
  await knex.schema.createTable('affirmations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.text('message').notNullable();
    table.string('author', 100);

    table
      .enum('category', [
        'general',
        'dating',
        'self_worth',
        'rejection',
        'confidence',
        'patience',
        'self_love',
        'new_beginnings',
        'vulnerability',
        'growth',
      ])
      .notNullable()
      .defaultTo('general');

    table.specificType('mood_tags', 'text[]'); // Tags for mood-based selection
    table.integer('weight').defaultTo(100); // For weighted random selection

    table.boolean('is_active').defaultTo(true);

    table.timestamps(true, true);

    table.index('category');
    table.index('is_active');
  });

  // Dating journey reflections prompts
  await knex.schema.createTable('reflection_prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.text('prompt_text').notNullable();
    table.text('follow_up_text'); // Optional follow-up question

    table
      .enum('category', [
        'recent_experiences',
        'self_discovery',
        'relationship_goals',
        'past_patterns',
        'growth_areas',
        'gratitude',
        'boundaries',
        'expectations',
        'communication',
        'self_care',
      ])
      .notNullable();

    table
      .enum('prompt_type', [
        'daily',
        'weekly',
        'milestone',
        'post_rejection',
        'post_match',
        'post_date',
      ])
      .defaultTo('weekly');

    table.integer('order_index').defaultTo(100);
    table.boolean('is_active').defaultTo(true);

    table.timestamps(true, true);

    table.index('category');
    table.index('prompt_type');
    table.index('is_active');
  });

  // User reflection responses (encrypted)
  await knex.schema.createTable('reflection_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('prompt_id')
      .notNullable()
      .references('id')
      .inTable('reflection_prompts')
      .onDelete('CASCADE');
    table
      .uuid('checkin_id')
      .references('id')
      .inTable('mental_health_checkins')
      .onDelete('SET NULL');

    table.text('response_encrypted').notNullable(); // Encrypted response
    table.string('encryption_key_id', 64);

    table.timestamp('auto_delete_at');

    table.timestamps(true, true);

    table.index('user_id');
    table.index('prompt_id');
    table.index('auto_delete_at');
  });

  // Usage pattern tracking for distress detection (aggregated, non-identifiable)
  await knex.schema.createTable('usage_wellness_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('metric_date').notNullable();

    // Aggregated metrics (no PII)
    table.integer('swipes_sent').defaultTo(0);
    table.integer('matches_received').defaultTo(0);
    table.integer('rejections_received').defaultTo(0); // Unmatches, expired matches
    table.integer('messages_sent').defaultTo(0);
    table.integer('messages_received').defaultTo(0);
    table.integer('session_count').defaultTo(0);
    table.integer('total_session_minutes').defaultTo(0);

    // Pattern indicators
    table.float('rejection_ratio'); // Calculated: rejections / matches
    table.float('response_rate'); // Calculated: responses / messages sent
    table.float('engagement_change'); // Compared to user's baseline

    table.timestamps(true, true);

    table.unique(['user_id', 'metric_date']);
    table.index('user_id');
    table.index('metric_date');
  });

  // Mental health break history
  await knex.schema.createTable('wellness_breaks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.timestamp('started_at').notNullable();
    table.timestamp('intended_end_at').notNullable();
    table.timestamp('actual_end_at');

    table
      .enum('break_type', ['mental_health', 'busy', 'traveling', 'relationship', 'other'])
      .defaultTo('mental_health');
    table.text('reason_encrypted'); // Optional encrypted reason

    table
      .enum('trigger', ['user_initiated', 'suggested', 'auto_enabled'])
      .defaultTo('user_initiated');

    table.integer('pre_break_mood_score');
    table.integer('post_break_mood_score');

    table.boolean('was_extended').defaultTo(false);
    table.boolean('ended_early').defaultTo(false);

    table.timestamps(true, true);

    table.index('user_id');
    table.index('started_at');
    table.index(['user_id', 'actual_end_at']);
  });

  // Seed initial resources
  await seedWellnessResources(knex);
  await seedAffirmations(knex);
  await seedReflectionPrompts(knex);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wellness_breaks');
  await knex.schema.dropTableIfExists('usage_wellness_metrics');
  await knex.schema.dropTableIfExists('reflection_responses');
  await knex.schema.dropTableIfExists('reflection_prompts');
  await knex.schema.dropTableIfExists('affirmations');
  await knex.schema.dropTableIfExists('wellness_resources');
  await knex.schema.dropTableIfExists('distress_detection_logs');
  await knex.schema.dropTableIfExists('wellness_settings');
  await knex.schema.dropTableIfExists('mental_health_checkins');
}

async function seedWellnessResources(knex: Knex): Promise<void> {
  const resources = [
    // Crisis Support
    {
      title: 'National Suicide Prevention Lifeline',
      description:
        '24/7 free and confidential support for people in distress, prevention and crisis resources.',
      phone_number: '988',
      category: 'crisis_support',
      resource_type: 'hotline',
      priority: 1,
      available_countries: ['US'],
      languages: ['en', 'es'],
      is_crisis_resource: true,
    },
    {
      title: 'Crisis Text Line',
      description: 'Text HOME to 741741 to connect with a Crisis Counselor. Free 24/7 support.',
      phone_number: '741741',
      category: 'crisis_support',
      resource_type: 'hotline',
      priority: 2,
      available_countries: ['US'],
      languages: ['en'],
      is_crisis_resource: true,
    },
    {
      title: 'Samaritans',
      description:
        'Emotional support for anyone in distress, struggling to cope, or at risk of suicide.',
      phone_number: '116 123',
      category: 'crisis_support',
      resource_type: 'hotline',
      priority: 1,
      available_countries: ['UK', 'IE'],
      languages: ['en'],
      is_crisis_resource: true,
    },
    {
      title: 'International Association for Suicide Prevention',
      description: 'Find crisis centers in your country.',
      url: 'https://www.iasp.info/resources/Crisis_Centres/',
      category: 'crisis_support',
      resource_type: 'professional_service',
      priority: 5,
      available_countries: [],
      languages: ['en'],
      is_crisis_resource: true,
    },
    // Dating Stress
    {
      title: 'Dealing with Dating App Burnout',
      description:
        'Practical strategies for managing dating app fatigue and maintaining mental wellness while dating online.',
      url: 'https://www.psychologytoday.com/us/blog/dating-app-burnout',
      category: 'dating_stress',
      resource_type: 'article',
      priority: 10,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Rejection Coping
    {
      title: 'Coping with Rejection in Dating',
      description: 'Learn healthy ways to process and move forward from romantic rejection.',
      url: 'https://www.verywellmind.com/coping-with-rejection-5092077',
      category: 'rejection_coping',
      resource_type: 'article',
      priority: 15,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Self Esteem
    {
      title: 'Building Self-Esteem in Relationships',
      description:
        'Exercises and insights to develop a healthy sense of self-worth independent of relationship status.',
      url: 'https://www.psychologytoday.com/us/basics/self-esteem',
      category: 'self_esteem',
      resource_type: 'article',
      priority: 20,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Anxiety Management
    {
      title: 'Headspace',
      description:
        'Guided meditation and mindfulness app with specific content for relationship anxiety.',
      url: 'https://www.headspace.com',
      category: 'anxiety_management',
      resource_type: 'app',
      priority: 25,
      languages: ['en'],
      is_crisis_resource: false,
    },
    {
      title: 'Calm',
      description: 'Sleep, meditation, and relaxation app with content for managing anxiety.',
      url: 'https://www.calm.com',
      category: 'anxiety_management',
      resource_type: 'app',
      priority: 26,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Professional Help
    {
      title: 'BetterHelp',
      description: 'Online therapy platform connecting you with licensed therapists.',
      url: 'https://www.betterhelp.com',
      category: 'professional_help',
      resource_type: 'professional_service',
      priority: 30,
      languages: ['en'],
      is_crisis_resource: false,
    },
    {
      title: 'Psychology Today Therapist Finder',
      description: 'Find therapists, psychiatrists, and counselors in your area.',
      url: 'https://www.psychologytoday.com/us/therapists',
      category: 'professional_help',
      resource_type: 'professional_service',
      priority: 31,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Loneliness
    {
      title: 'Understanding and Coping with Loneliness',
      description: 'Research-based strategies for managing feelings of loneliness and isolation.',
      url: 'https://www.verywellmind.com/loneliness',
      category: 'loneliness',
      resource_type: 'article',
      priority: 35,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // General Wellness
    {
      title: '7 Cups',
      description: 'Free online chat with trained listeners for emotional support.',
      url: 'https://www.7cups.com',
      category: 'general_wellness',
      resource_type: 'peer_support',
      priority: 40,
      languages: ['en'],
      is_crisis_resource: false,
    },
    // Relationship Anxiety
    {
      title: 'Managing Relationship Anxiety',
      description: 'Understanding attachment styles and managing anxiety in new relationships.',
      url: 'https://www.attachmentproject.com/',
      category: 'relationship_anxiety',
      resource_type: 'article',
      priority: 45,
      languages: ['en'],
      is_crisis_resource: false,
    },
  ];

  await knex('wellness_resources').insert(resources);
}

async function seedAffirmations(knex: Knex): Promise<void> {
  const affirmations = [
    // General
    {
      message: 'You are worthy of love exactly as you are.',
      category: 'general',
      mood_tags: ['low', 'neutral'],
    },
    {
      message: 'Your value is not determined by your relationship status.',
      category: 'self_worth',
      mood_tags: ['low', 'rejection'],
    },
    {
      message: 'Each day brings new opportunities to connect with amazing people.',
      category: 'new_beginnings',
      mood_tags: ['neutral', 'hopeful'],
    },

    // Dating specific
    {
      message: 'Being single is an opportunity for self-discovery, not a problem to be solved.',
      category: 'dating',
      mood_tags: ['low', 'lonely'],
    },
    {
      message: 'The right person will appreciate you for who you are.',
      category: 'dating',
      mood_tags: ['rejection', 'anxious'],
    },
    {
      message: 'Dating is a journey of learning about yourself and others.',
      category: 'dating',
      mood_tags: ['neutral'],
    },
    {
      message: 'Every "no" brings you closer to the right "yes."',
      category: 'rejection',
      mood_tags: ['rejection', 'low'],
    },

    // Self-worth
    {
      message: 'You are complete on your own; a partner would be an addition, not a completion.',
      category: 'self_worth',
      mood_tags: ['low', 'lonely'],
    },
    {
      message: 'Your past relationships do not define your future.',
      category: 'self_worth',
      mood_tags: ['low', 'anxious'],
    },
    {
      message: 'You deserve someone who sees and values the real you.',
      category: 'self_worth',
      mood_tags: ['rejection', 'low'],
    },

    // Rejection
    {
      message: 'Rejection is redirection toward someone more compatible.',
      category: 'rejection',
      mood_tags: ['rejection'],
    },
    {
      message: 'Not every connection is meant to last, and that is okay.',
      category: 'rejection',
      mood_tags: ['rejection', 'sad'],
    },
    {
      message: 'Their inability to see your worth says nothing about your value.',
      category: 'rejection',
      mood_tags: ['rejection', 'low'],
    },

    // Confidence
    {
      message: 'You have unique qualities that make you special.',
      category: 'confidence',
      mood_tags: ['low', 'anxious'],
    },
    {
      message: 'Confidence grows with each step outside your comfort zone.',
      category: 'confidence',
      mood_tags: ['neutral', 'hopeful'],
    },
    {
      message: 'You are braver than you believe and stronger than you seem.',
      category: 'confidence',
      mood_tags: ['anxious', 'low'],
    },

    // Patience
    {
      message: 'Good things take time. Trust the process.',
      category: 'patience',
      mood_tags: ['frustrated', 'impatient'],
    },
    {
      message: 'The best relationships often begin when you least expect them.',
      category: 'patience',
      mood_tags: ['neutral', 'hopeful'],
    },
    {
      message: 'Your timeline is unique to you. There is no deadline for love.',
      category: 'patience',
      mood_tags: ['anxious', 'frustrated'],
    },

    // Self-love
    {
      message: 'Taking a break from dating is a form of self-care.',
      category: 'self_love',
      mood_tags: ['overwhelmed', 'burnt_out'],
    },
    {
      message: 'You are allowed to prioritize your mental health.',
      category: 'self_love',
      mood_tags: ['stressed', 'overwhelmed'],
    },
    {
      message: 'Loving yourself first creates space for healthy love from others.',
      category: 'self_love',
      mood_tags: ['neutral', 'hopeful'],
    },

    // Vulnerability
    {
      message: 'Vulnerability is not weakness; it is the birthplace of connection.',
      category: 'vulnerability',
      mood_tags: ['anxious', 'scared'],
    },
    {
      message: 'Opening your heart takes courage, and you have that courage.',
      category: 'vulnerability',
      mood_tags: ['neutral', 'hopeful'],
    },

    // Growth
    {
      message: 'Every experience in dating teaches you something valuable.',
      category: 'growth',
      mood_tags: ['neutral', 'reflective'],
    },
    {
      message: 'You are becoming more aware of what you need and deserve.',
      category: 'growth',
      mood_tags: ['neutral', 'hopeful'],
    },
    {
      message: 'Growth happens outside of comfort zones. Be proud of yourself for trying.',
      category: 'growth',
      mood_tags: ['low', 'neutral'],
    },
  ];

  await knex('affirmations').insert(affirmations);
}

async function seedReflectionPrompts(knex: Knex): Promise<void> {
  const prompts = [
    // Recent experiences
    {
      prompt_text: 'What is one positive interaction you had while dating this week?',
      category: 'recent_experiences',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'What did you learn about yourself from your dating experiences this week?',
      category: 'recent_experiences',
      prompt_type: 'weekly',
      order_index: 2,
    },
    {
      prompt_text: 'How did you show up authentically in your conversations today?',
      category: 'recent_experiences',
      prompt_type: 'daily',
      order_index: 1,
    },

    // Self-discovery
    {
      prompt_text:
        'What qualities are you looking for in a partner, and why are those important to you?',
      category: 'self_discovery',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'What aspects of yourself do you want a partner to appreciate most?',
      category: 'self_discovery',
      prompt_type: 'weekly',
      order_index: 2,
    },
    {
      prompt_text:
        'What makes you feel most alive and engaged? How can you bring more of that into your dating life?',
      category: 'self_discovery',
      prompt_type: 'weekly',
      order_index: 3,
    },

    // Relationship goals
    {
      prompt_text: 'What does your ideal relationship look and feel like?',
      category: 'relationship_goals',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'What are your non-negotiables in a relationship?',
      category: 'relationship_goals',
      prompt_type: 'weekly',
      order_index: 2,
    },
    {
      prompt_text: 'How would you like to grow together with a partner?',
      category: 'relationship_goals',
      prompt_type: 'weekly',
      order_index: 3,
    },

    // Past patterns
    {
      prompt_text: 'What patterns from past relationships would you like to change?',
      category: 'past_patterns',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'What have your past relationships taught you about what you need?',
      category: 'past_patterns',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Growth areas
    {
      prompt_text: 'What is one area of personal growth you are working on?',
      category: 'growth_areas',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'How are you becoming a better version of yourself for a future relationship?',
      category: 'growth_areas',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Gratitude
    {
      prompt_text: 'What are three things about yourself that you are grateful for?',
      category: 'gratitude',
      prompt_type: 'daily',
      order_index: 1,
    },
    {
      prompt_text: 'What positive aspect of your dating journey are you thankful for?',
      category: 'gratitude',
      prompt_type: 'weekly',
      order_index: 1,
    },

    // Boundaries
    {
      prompt_text: 'What boundaries have you set in your dating life that make you proud?',
      category: 'boundaries',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'Is there a boundary you need to communicate more clearly?',
      category: 'boundaries',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Expectations
    {
      prompt_text: 'Are your expectations for a partner realistic and healthy?',
      category: 'expectations',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'How can you balance hope with openness to unexpected connections?',
      category: 'expectations',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Communication
    {
      prompt_text: 'What is one way you can improve your communication in dating?',
      category: 'communication',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'How do you express interest while staying true to yourself?',
      category: 'communication',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Self-care
    {
      prompt_text: 'How are you taking care of yourself outside of dating?',
      category: 'self_care',
      prompt_type: 'weekly',
      order_index: 1,
    },
    {
      prompt_text: 'What brings you joy that has nothing to do with relationships?',
      category: 'self_care',
      prompt_type: 'weekly',
      order_index: 2,
    },

    // Post-event prompts
    {
      prompt_text: 'Rejection can be painful. What can you learn from this experience?',
      category: 'past_patterns',
      prompt_type: 'post_rejection',
      order_index: 1,
      follow_up_text: 'Remember, their decision reflects compatibility, not your worth.',
    },
    {
      prompt_text: 'Congratulations on your new match! What drew you to this person?',
      category: 'recent_experiences',
      prompt_type: 'post_match',
      order_index: 1,
    },
    {
      prompt_text: 'How did you feel during and after your date?',
      category: 'recent_experiences',
      prompt_type: 'post_date',
      order_index: 1,
      follow_up_text: 'What went well, and what might you do differently?',
    },
  ];

  await knex('reflection_prompts').insert(prompts);
}
