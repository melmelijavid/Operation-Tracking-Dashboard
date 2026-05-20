// Emails the assignee of a ticket whose SLA has become urgent
// (≤ 8 hours remaining). Idempotent — sets tickets.urgent_notified_at once
// the email goes out, so it won't fire again for the same ticket.
//
// Called from two places:
//   - ticketController on create/update (immediate notification when a
//     ticket lands or moves into the urgent window)
//   - jobs/urgentTicketScheduler (catches tickets that cross the threshold
//     by the passage of time, between writes)

import { query } from '../db.js';
import { sendEmail } from './email.js';
import { escapeHtml } from './html.js';

const URGENT_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function notifyUrgentTicketIfNeeded(ticketId) {
  const result = await query(
    `SELECT
       t.id,
       t.description,
       t.status,
       t.priority,
       t.sla_deadline,
       t.urgent_notified_at,
       t.assigned_person_user_id,
       au.email AS assignee_email,
       au.name  AS assignee_name,
       au.email_notifications_enabled,
       au.status AS assignee_status
     FROM tickets t
     LEFT JOIN users au ON au.id = t.assigned_person_user_id
     WHERE t.id = $1`,
    [ticketId]
  );
  if (result.rowCount === 0) return;
  const t = result.rows[0];

  // Bail early on the cheap checks.
  if (t.urgent_notified_at) return;                       // already notified
  if (!t.sla_deadline) return;                            // no deadline → no urgency
  if (t.status === 'Resolved' || t.status === 'Closed') return;
  if (!t.assigned_person_user_id) return;                 // no one to notify
  if (!t.email_notifications_enabled) return;             // muted
  if (t.assignee_status !== 'active') return;             // disabled account

  const deadline = new Date(t.sla_deadline).getTime();
  const msRemaining = deadline - Date.now();
  // We treat "≤ 8h" as urgent. Anything past the deadline counts too.
  if (msRemaining > URGENT_THRESHOLD_MS) return;

  const overdue = msRemaining < 0;
  const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (60 * 60 * 1000)));

  const appUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const ticketUrl = `${appUrl}/tickets/${encodeURIComponent(t.id)}`;
  const subject = overdue
    ? `[Overdue] Ticket ${t.id} is past its SLA`
    : `[Urgent] Ticket ${t.id} — ${hoursRemaining}h or less remaining`;

  try {
    await sendEmail({
      to: t.assignee_email,
      subject,
      text:
        `Hi ${t.assignee_name},\n\n` +
        `${overdue
          ? `Ticket ${t.id} is past its SLA deadline and still ${t.status}.`
          : `Ticket ${t.id} has under 8 hours remaining (currently ${t.status}, ${t.priority} priority).`}\n\n` +
        `"${t.description}"\n\n` +
        `Open the ticket: ${ticketUrl}\n`,
      html: `
        <p>Hi ${escapeHtml(t.assignee_name)},</p>
        <p>${overdue
          ? `Ticket <a href="${ticketUrl}">${escapeHtml(t.id)}</a> is <strong>past its SLA deadline</strong> and still ${escapeHtml(t.status)}.`
          : `Ticket <a href="${ticketUrl}">${escapeHtml(t.id)}</a> has <strong>under 8 hours</strong> remaining (currently ${escapeHtml(t.status)}, ${escapeHtml(t.priority)} priority).`}</p>
        <p><em>${escapeHtml(t.description)}</em></p>
        <p><a href="${ticketUrl}">Open the ticket</a></p>
      `,
    });
    await query(
      'UPDATE tickets SET urgent_notified_at = NOW() WHERE id = $1',
      [t.id]
    );
  } catch (err) {
    // Don't mark notified — next scheduler tick will retry.
    console.error(`[urgent-email] Failed to notify ${t.assignee_email} for ${t.id}:`, err);
  }
}
