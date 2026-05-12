import { apiRequest } from './api';

// Lightweight read of active teams, used by ticket form dropdowns.
export async function fetchTeams() {
  return apiRequest('/teams');
}
