import { AUTH_ROLES } from '../auth';
import { apiRequest } from './api';

export async function fetchTickets() {
  return apiRequest('/tickets');
}

export async function fetchTicket(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}`);
}

export async function fetchTicketHistory(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/history`);
}

export async function fetchTicketComments(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/comments`);
}

export async function addTicketComment(ticketId, commentText) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ commentText }),
  });
}

export async function deleteTicketComment(ticketId, commentId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}

export async function createTicket(ticket) {
  return apiRequest('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

export async function updateTicket(ticket) {
  return apiRequest(`/tickets/${encodeURIComponent(ticket.id)}`, {
    method: 'PUT',
    body: JSON.stringify(ticket),
  });
}

export async function deleteTicket(ticketId) {
  return apiRequest(`/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'DELETE',
  });
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getUserKeys(user) {
  if (!user) return [];

  const email = normalizeValue(user.email);
  const emailName = email.includes('@') ? email.split('@')[0] : email;

  return Array.from(new Set([
    normalizeValue(user.name),
    email,
    emailName,
    normalizeValue(user.id),
  ].filter(Boolean)));
}

function ticketMatchesUser(ticket, user) {
  const userKeys = getUserKeys(user);
  const owner = normalizeValue(ticket.Owner);
  const assignedPerson = normalizeValue(ticket.Assigned_Person);

  return userKeys.some((key) => key === owner || key === assignedPerson);
}

export function getDashboardTicketsForRole(tickets, role) {
  if (!role) return [];
  if (
    role === AUTH_ROLES.ADMIN ||
    role === AUTH_ROLES.OPERATOR ||
    role === AUTH_ROLES.VIEWER
  ) {
    return tickets;
  }
  return [];
}

export function getTicketManagementTicketsForRole(tickets, role, user) {
  if (!role) return [];
  if (role === AUTH_ROLES.ADMIN) return tickets;
  if (role === AUTH_ROLES.VIEWER) return [];
  if (role === AUTH_ROLES.OPERATOR) {
    return tickets.filter((ticket) => ticketMatchesUser(ticket, user));
  }
  return [];
}
