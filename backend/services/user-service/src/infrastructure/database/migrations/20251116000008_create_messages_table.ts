import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('conversation_id')
      .notNullable()
      .references('id')
      .inTable('conversations')
      .onDelete('CASCADE');
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('receiver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at');
    table.enum('status', ['sent', 'delivered', 'read']).defaultTo('sent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['conversation_id', 'created_at']);
    table.index(['sender_id', 'created_at']);
    table.index(['receiver_id', 'is_read']);
  });

  // Create trigger to update conversations.updated_at when a message is inserted
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_conversation_on_message()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE conversations
      SET
        last_message = NEW.content,
        last_message_at = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        updated_at = NEW.created_at,
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages');
  await knex.raw('DROP FUNCTION IF EXISTS update_conversation_on_message');
  await knex.schema.dropTableIfExists('messages');
}
