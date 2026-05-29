/**
 * Direct messages between application users.
 *
 * This table stores one-to-one messages. We keep the design intentionally
 * simple for the first version: one row is one message from one user to
 * another user.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id SERIAL PRIMARY KEY,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT direct_messages_no_self_message
        CHECK (sender_user_id <> receiver_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_direct_messages_pair_created
      ON direct_messages(sender_user_id, receiver_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_unread
      ON direct_messages(receiver_user_id, is_read, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_direct_messages_receiver_unread;
    DROP INDEX IF EXISTS idx_direct_messages_pair_created;
    DROP TABLE IF EXISTS direct_messages;
  `);
};
