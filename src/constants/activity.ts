import type {
  CheckInActivityCode,
  FreightActivityCode,
  OfficeActivityCode,
  TicketActivityCode,
  UserActivityCode,
} from '@/types/activity'

export const USER_ACTIVITY_LABELS: Record<UserActivityCode, string> = {
  registrated: 'Inscription utilisateur',
  admin_access_created: 'Accès administrateur créé',
}

export const OFFICE_ACTIVITY_LABELS: Record<OfficeActivityCode, string> = {
  'office.created': 'Création du bureau',
  'office.updated': 'Modification du bureau',
}

export const TICKET_ACTIVITY_LABELS: Record<TicketActivityCode, string> = {
  'ticket.created': 'Création du billet',
  'ticket.updated': 'Modification du billet',
  'ticket.cancelled': 'Annulation du billet',
  'ticket.used': 'Utilisation du billet',
  'ticket.refunded': 'Remboursement du billet',
}

export const CHECKIN_ACTIVITY_LABELS: Record<CheckInActivityCode, string> = {
  'checkin.created': 'Création du check-in',
  'checkin.updated': 'Modification du check-in',
}

export const FREIGHT_ACTIVITY_LABELS: Record<FreightActivityCode, string> = {
  'freight.created': 'Création de l\'expédition',
  'freight.sent': 'Expédition envoyée',
  'freight.arrived': 'Arrivée à destination',
  'freight.delivered': 'Livraison effectuée',
  'freight.cancelled': 'Annulation de l\'expédition',
}

const ACTIVITY_LABELS: Record<string, string> = {
  ...USER_ACTIVITY_LABELS,
  ...OFFICE_ACTIVITY_LABELS,
  ...TICKET_ACTIVITY_LABELS,
  ...CHECKIN_ACTIVITY_LABELS,
  ...FREIGHT_ACTIVITY_LABELS,
}

export function getActivityLabel(code: string): string {
  return ACTIVITY_LABELS[code] ?? code
}

export function activityFilterOptions() {
  return [
    { value: '', label: 'Toutes les actions' },
    { value: 'registrated', label: USER_ACTIVITY_LABELS.registrated },
    { value: 'admin_access_created', label: USER_ACTIVITY_LABELS.admin_access_created },
    { value: 'office.created', label: OFFICE_ACTIVITY_LABELS['office.created'] },
    { value: 'office.updated', label: OFFICE_ACTIVITY_LABELS['office.updated'] },
    { value: 'ticket.created', label: TICKET_ACTIVITY_LABELS['ticket.created'] },
    { value: 'ticket.updated', label: TICKET_ACTIVITY_LABELS['ticket.updated'] },
    { value: 'ticket.cancelled', label: TICKET_ACTIVITY_LABELS['ticket.cancelled'] },
    { value: 'ticket.used', label: TICKET_ACTIVITY_LABELS['ticket.used'] },
    { value: 'ticket.refunded', label: TICKET_ACTIVITY_LABELS['ticket.refunded'] },
    { value: 'checkin.created', label: CHECKIN_ACTIVITY_LABELS['checkin.created'] },
    { value: 'checkin.updated', label: CHECKIN_ACTIVITY_LABELS['checkin.updated'] },
    { value: 'freight.created', label: FREIGHT_ACTIVITY_LABELS['freight.created'] },
    { value: 'freight.sent', label: FREIGHT_ACTIVITY_LABELS['freight.sent'] },
    { value: 'freight.arrived', label: FREIGHT_ACTIVITY_LABELS['freight.arrived'] },
    { value: 'freight.delivered', label: FREIGHT_ACTIVITY_LABELS['freight.delivered'] },
    { value: 'freight.cancelled', label: FREIGHT_ACTIVITY_LABELS['freight.cancelled'] },
  ]
}
