// Append-only audit log writer.
//
// Usage inside a transaction:
//   await recordAuditEvent({ executor: client, actor, action, target, details });
//
// Usage outside a transaction:
//   await recordAuditEvent({ actor, action, target, details });
//
// `actor` is { id, label }. `target` is { type, id, label }. `details` is
// any JSON-serialisable object (will default to {} if omitted).

import { query as defaultQuery } from '../db.js';

export async function recordAuditEvent({ executor, actor, action, target, details }) {
  if (!action) throw new Error('recordAuditEvent: action is required.');

  const runner = executor && typeof executor.query === 'function'
    ? executor
    : { query: defaultQuery };

  await runner.query(
    `INSERT INTO admin_audit_log
       (actor_user_id, actor_label, action, target_type, target_id, target_label, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actor?.id ?? null,
      actor?.label ?? null,
      action,
      target?.type ?? null,
      target?.id != null ? String(target.id) : null,
      target?.label ?? null,
      JSON.stringify(details || {}),
    ]
  );
}

// Convenience for the common case where the caller has req.user.
export function actorFromReq(req) {
  if (!req?.user) return null;
  return {
    id: req.user.id,
    label: req.user.email || req.user.name || `user#${req.user.id}`,
  };
}
