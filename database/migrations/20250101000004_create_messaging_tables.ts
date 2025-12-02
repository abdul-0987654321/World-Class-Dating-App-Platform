import { Knex } from 'knex';

/**
 * Migration: Create Messaging Tables
 * Description: Conversations and messages between matched users
 */
export async function up(knex: Knex): Promise<void> {
  // Create conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user1_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user2_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('match_id').notNullable()
      .references('id').inTable('matches').onDelete('CASCADE');

    // Last message metadata
    table.text('last_message').nullable();
    table.timestamp('last_message_at').nullable();
    table.uuid('last_message_sender_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    // Unread counts for each user
    table.integer('unread_count_user1').defaultTo(0);
    table.integer('unread_count_user2').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Ensure user1_id < user2_id for consistency
    table.check('user1_id < user2_id');

    // Unique constraints
    table.unique(['user1_id', 'user2_id']);
    table.unique(['match_id']);

    // Indexes for performance
    table.index(['user1_id', 'updated_at']);
    table.index(['user2_id', 'updated_at']);
    table.index('match_id');
    table.index('last_message_at');
  });

  // Create messages table
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('sender_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('receiver_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Message content
    table.text('content').notNullable();

    // Message type (text, image, gif, etc.)
    table.enum('type', ['text', 'image', 'gif', 'emoji', 'voice'])
      .defaultTo('text');

    // Media URL (for images, gifs, voice notes)
    table.string('media_url', 500).nullable();

    // Read status
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at').nullable();

    // Delivery status
    table.enum('status', ['sent', 'delivered', 'read'])
      .defaultTo('sent');

    // Timestamps
    table.timestamp('sent_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    // Indexes for performance
    table.index(['conversation_id', 'sent_at']);
    table.index(['sender_id', 'sent_at']);
    table.index(['receiver_id', 'is_read']);
    table.index('sent_at');
  });

  // Create trigger to update conversations when a message is inserted
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_conversation_on_message()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE conversations
      SET
        last_message = NEW.content,
        last_message_at = NEW.sent_at,
        last_message_sender_id = NEW.sender_id,
        updated_at = NEW.sent_at,
        unread_count_user1 = CASE
          WHEN user1_id = NEW.receiver_id THEN unread_count_user1 + 1
          ELSE unread_count_user1
        END,
        unread_count_user2 = CASE
          WHEN user2_id = NEW.receiver_id THEN unread_count_user2 + 1
          ELSE unread_count_user2
        END
      WHERE id = NEW.conversation_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();
  `);

  // Create trigger to reset unread count when messages are read
  await knex.raw(`
    CREATE OR REPLACE FUNCTION reset_unread_count_on_read()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.is_read = true AND OLD.is_read = false THEN
        UPDATE conversations
        SET
          unread_count_user1 = CASE
            WHEN user1_id = NEW.receiver_id THEN GREATEST(0, unread_count_user1 - 1)
            ELSE unread_count_user1
          END,
          unread_count_user2 = CASE
            WHEN user2_id = NEW.receiver_id THEN GREATEST(0, unread_count_user2 - 1)
            ELSE unread_count_user2
          END
        WHERE id = NEW.conversation_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_reset_unread_count
    AFTER UPDATE ON messages
    FOR EACH ROW
    WHEN (NEW.is_read = true AND OLD.is_read = false)
    EXECUTE FUNCTION reset_unread_count_on_read();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trigger_reset_unread_count ON messages');
  await knex.raw('DROP FUNCTION IF EXISTS reset_unread_count_on_read');
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages');
  await knex.raw('DROP FUNCTION IF EXISTS update_conversation_on_message');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversations');
}
