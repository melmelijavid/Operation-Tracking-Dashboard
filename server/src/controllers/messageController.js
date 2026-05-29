import { query } from '../db.js';
import { httpError } from '../utils/httpError.js';

const MAX_MESSAGE_LENGTH = 2000;

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url || '',
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    receiverUserId: row.receiver_user_id,
    messageText: row.message_text,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function parseUserId(rawId) {
  const userId = Number(rawId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw httpError(400, 'Valid user id is required.');
  }
  return userId;
}
//check if target exist cevher :)
async function ensureMessageTarget(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    throw httpError(400, 'You cannot send a direct message to yourself.');
  }

  const result = await query(
    `SELECT id, name, email, role, avatar_url
     FROM users
     WHERE id = $1
       AND COALESCE(status, 'active') = 'active'`,
    [targetUserId]
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'User not found.');
  }

  return mapUserRow(result.rows[0]);
}

export async function getMessageUsers(req, res) {
  const result = await query(
    `SELECT id, name, email, role, avatar_url
     FROM users
     WHERE id <> $1
       AND COALESCE(status, 'active') = 'active'
     ORDER BY name ASC`,
    [req.user.id]
  );

  return res.json(result.rows.map(mapUserRow));
}
//my unread messages
export async function getUnreadMessageCount(req, res) {
  const result = await query(
    `SELECT COUNT(*)::INTEGER AS unread_count
     FROM direct_messages
     WHERE receiver_user_id = $1
       AND is_read = false`,
    [req.user.id]
  );

  return res.json({ unreadCount: result.rows[0]?.unread_count || 0 });
}

export async function getMessageConversations(req, res) {
  const result = await query(
    `WITH my_messages AS (
       SELECT
         dm.*,
         CASE
           WHEN dm.sender_user_id = $1 THEN dm.receiver_user_id
           ELSE dm.sender_user_id
         END AS partner_user_id
       FROM direct_messages dm
       WHERE dm.sender_user_id = $1
          OR dm.receiver_user_id = $1
     ),
     ranked_messages AS (
       SELECT
         my_messages.*,
         ROW_NUMBER() OVER (
           PARTITION BY partner_user_id
           ORDER BY created_at DESC, id DESC
         ) AS message_rank
       FROM my_messages
     ),
     unread_counts AS (
       SELECT
         sender_user_id AS partner_user_id,
         COUNT(*)::INTEGER AS unread_count
       FROM direct_messages
       WHERE receiver_user_id = $1
         AND is_read = false
       GROUP BY sender_user_id
     )
     SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.avatar_url,
       rm.id AS last_message_id,
       rm.sender_user_id,
       rm.receiver_user_id,
       rm.message_text,
       rm.is_read,
       rm.read_at,
       rm.created_at,
       COALESCE(uc.unread_count, 0) AS unread_count
     FROM ranked_messages rm
     JOIN users u ON u.id = rm.partner_user_id
     LEFT JOIN unread_counts uc ON uc.partner_user_id = rm.partner_user_id
     WHERE rm.message_rank = 1
     ORDER BY rm.created_at DESC, rm.id DESC`,
    [req.user.id]
  );

  return res.json(result.rows.map((row) => ({
    user: mapUserRow(row),
    unreadCount: row.unread_count,
    lastMessage: mapMessageRow({
      ...row,
      id: row.last_message_id,
    }),
  })));
}

export async function getConversationMessages(req, res) {
  const targetUserId = parseUserId(req.params.userId);
  await ensureMessageTarget(req.user.id, targetUserId);

  const result = await query(
    `SELECT id, sender_user_id, receiver_user_id, message_text, is_read, read_at, created_at
     FROM direct_messages
     WHERE (sender_user_id = $1 AND receiver_user_id = $2)
        OR (sender_user_id = $2 AND receiver_user_id = $1)
     ORDER BY created_at ASC, id ASC`,
    [req.user.id, targetUserId]
  );

  return res.json(result.rows.map(mapMessageRow));
}

export async function sendMessage(req, res) {
  const targetUserId = parseUserId(req.params.userId);
  await ensureMessageTarget(req.user.id, targetUserId);

  const messageText = req.body?.messageText?.trim();
  if (!messageText) {
    throw httpError(400, 'Message text is required.');
  }
  if (messageText.length > MAX_MESSAGE_LENGTH) {
    throw httpError(400, `Message text must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
  }

  const result = await query(
    `INSERT INTO direct_messages (sender_user_id, receiver_user_id, message_text)
     VALUES ($1, $2, $3)
     RETURNING id, sender_user_id, receiver_user_id, message_text, is_read, read_at, created_at`,
    [req.user.id, targetUserId, messageText]
  );

  return res.status(201).json(mapMessageRow(result.rows[0]));
}

export async function markConversationRead(req, res) {
  const targetUserId = parseUserId(req.params.userId);
  await ensureMessageTarget(req.user.id, targetUserId);

  const result = await query(
    `UPDATE direct_messages
     SET is_read = true,
         read_at = COALESCE(read_at, NOW())
     WHERE sender_user_id = $1
       AND receiver_user_id = $2
       AND is_read = false
     RETURNING id`,
    [targetUserId, req.user.id]
  );

  return res.json({ updatedCount: result.rowCount });
}
