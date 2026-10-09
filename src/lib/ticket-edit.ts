import { ROLES, hasRole, type Role } from '@/constants/roles'
import { TICKET_STATUS } from '@/constants/ticket'
import type { Ticket } from '@/types/ticket'

/** Fenêtre d'édition après émission (billets ISSUED). */
export const TICKET_EDIT_WINDOW_HOURS = 24

export function getTicketEditDeadline(ticket: Pick<Ticket, 'issuedAt' | 'status'>): Date | null {
  if (ticket.status !== TICKET_STATUS.ISSUED || !ticket.issuedAt) return null
  const issued = new Date(ticket.issuedAt)
  if (Number.isNaN(issued.getTime())) return null
  return new Date(issued.getTime() + TICKET_EDIT_WINDOW_HOURS * 60 * 60 * 1000)
}

export function isTicketWithinEditWindow(
  ticket: Pick<Ticket, 'issuedAt' | 'status'>,
  now = new Date(),
): boolean {
  if (ticket.status === TICKET_STATUS.RESERVED) return true
  if (ticket.status !== TICKET_STATUS.ISSUED) return false
  const deadline = getTicketEditDeadline(ticket)
  if (!deadline) return true
  return now.getTime() <= deadline.getTime()
}

/** Admin / super-admin peuvent modifier hors fenêtre 24 h. */
export function canBypassTicketEditWindow(userRoles: string[] | undefined): boolean {
  return hasRole(userRoles ?? [], [ROLES.SPADM, ROLES.ADM] as Role[])
}

export function canEditTicketContent(
  ticket: Pick<Ticket, 'issuedAt' | 'status'>,
  userRoles: string[] | undefined,
  now = new Date(),
): boolean {
  if (ticket.status === TICKET_STATUS.RESERVED) return true
  if (ticket.status !== TICKET_STATUS.ISSUED) return false
  if (canBypassTicketEditWindow(userRoles)) return true
  return isTicketWithinEditWindow(ticket, now)
}

/** Réservation sans acompte → suppression définitive possible. */
export function canHardDeleteTicket(ticket: Pick<Ticket, 'status' | 'paidAmount'>): boolean {
  if (ticket.status !== TICKET_STATUS.RESERVED) return false
  const paid = parseFloat(String(ticket.paidAmount ?? '0').replace(',', '.'))
  return !Number.isFinite(paid) || paid <= 0
}

export function formatTicketEditWindowLabel(ticket: Pick<Ticket, 'issuedAt' | 'status'>): string | null {
  const deadline = getTicketEditDeadline(ticket)
  if (!deadline) return null
  return deadline.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
