import { getSlaPresentation } from './sla.js';

export function mapTicketRow(row) {
  const sla = getSlaPresentation(row);

  return {
    id: row.id,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedGroup: row.assigned_group,
    serviceType: row.service_type,
    submitDate: row.submit_date,
    lastModifiedDate: row.last_modified_date || '',
    closeDate: row.close_date || '',
    company: row.company || '',
    productCategorizationTier1: row.product_categorization_tier1 || '',
    productCategorizationTier2: row.product_categorization_tier2 || '',
    productCategorizationTier3: row.product_categorization_tier3 || '',
    categorizationTier1: row.categorization_tier1 || '',
    slaType: row.sla_type || '',
    slaHours: row.sla_hours,
    slaDeadline: row.sla_deadline || '',
    slaRemainingMinutes: sla.slaRemainingMinutes,
    slaRemainingLabel: sla.slaRemainingLabel,
    slaUrgency: sla.slaUrgency,
    aging: row.aging,
    Owner: row.owner_name,
    ownerUserId: row.owner_user_id,
    Assigned_Person: row.assigned_person_name || '',
    assignedPersonUserId: row.assigned_person_user_id,
  };
}
