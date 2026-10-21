/**
 * Paramètres métiers billetterie — alignés sur EXTRAITS DES CONDITIONS DU CONTRAT.
 * À garder synchronisés avec App\Ticketing\TicketBusinessRules (API).
 */
export const TICKET_BUSINESS_RULES = {
  /**
   * #1 — Frais « imprimer de valeur » si débarquement (fraction du prix).
   * 0.05 = 5 %.
   */
  offloadFeeRate: 0.05,

  /**
   * #3 — Validité du billet à partir de la date d'émission (jours).
   */
  validityDaysFromIssue: 30,

  /**
   * #6 — Taux de remboursement si impossibilité de voyager (hors cas #7).
   * 0.5 = 50 % du prix rendu (réduction 50 %).
   */
  refundRate: 0.5,

  /**
   * #7 — Annulation gratuite si ≥ N heures avant le voyage.
   */
  cancelFreeBeforeHours: 72,

  /**
   * #7 — Pénalité (USD) si annulation à moins de cancelFreeBeforeHours
   * mais hors fenêtre noshow.
   */
  cancelPenaltyUsd: 100,

  /**
   * #7 — Dans les N heures avant embarquement : billet caduc (noshow).
   */
  noshowWithinHours: 24,

  /**
   * #4 — Checking bagages : minimum d'heures avant embarquement (info / alerte).
   */
  baggageCheckInMinHoursBeforeBoarding: 2,
} as const

export type TicketBusinessRules = typeof TICKET_BUSINESS_RULES

export const TICKET_CANCEL_POLICY = {
  FREE: 'free',
  PENALTY: 'penalty',
  NOSHOW: 'noshow',
} as const

export type TicketCancelPolicy =
  (typeof TICKET_CANCEL_POLICY)[keyof typeof TICKET_CANCEL_POLICY]

/** #3 — prix payé intégralement pour voyager / check-in / USED. */
export const TICKET_UNPAID_TRAVEL_MESSAGE =
  'Le billet n\'est pas soldé. Le prix doit être payé intégralement avant le check-in.'

type TicketTravelInput = {
  travelDate?: string | null
  travelTime?: string | null
  paidAmount?: string | null
  totalAmount?: string | null
  cancelPolicy?: string | null
  cancelPolicyMessage?: string | null
  canCancel?: boolean
  refundPreviewAmount?: string | null
  offloadFeePreviewAmount?: string | null
}

function resolveTravelAt(
  travelDate?: string | null,
  travelTime?: string | null,
): Date | null {
  if (!travelDate?.trim()) return null
  const datePart = travelDate.includes('T')
    ? travelDate.slice(0, 10)
    : travelDate.trim()
  let time = (travelTime ?? '').trim() || '00:00:00'
  if (/^\d{2}:\d{2}$/.test(time)) time = `${time}:00`
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) time = '00:00:00'
  const date = new Date(`${datePart}T${time}`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getTicketHoursUntilTravel(
  ticket: TicketTravelInput,
  now: Date = new Date(),
): number | null {
  const travelAt = resolveTravelAt(ticket.travelDate, ticket.travelTime)
  if (!travelAt) return null
  return (travelAt.getTime() - now.getTime()) / (60 * 60 * 1000)
}

export function getTicketCancelPolicy(
  ticket: TicketTravelInput,
  now: Date = new Date(),
): TicketCancelPolicy {
  if (
    ticket.cancelPolicy === TICKET_CANCEL_POLICY.FREE
    || ticket.cancelPolicy === TICKET_CANCEL_POLICY.PENALTY
    || ticket.cancelPolicy === TICKET_CANCEL_POLICY.NOSHOW
  ) {
    return ticket.cancelPolicy
  }
  const hours = getTicketHoursUntilTravel(ticket, now)
  if (hours == null) return TICKET_CANCEL_POLICY.FREE
  if (hours < TICKET_BUSINESS_RULES.noshowWithinHours) {
    return TICKET_CANCEL_POLICY.NOSHOW
  }
  if (hours < TICKET_BUSINESS_RULES.cancelFreeBeforeHours) {
    return TICKET_CANCEL_POLICY.PENALTY
  }
  return TICKET_CANCEL_POLICY.FREE
}

export function getTicketCancelPolicyMessage(
  ticket: TicketTravelInput,
  now: Date = new Date(),
): string {
  if (ticket.cancelPolicyMessage?.trim()) return ticket.cancelPolicyMessage
  const policy = getTicketCancelPolicy(ticket, now)
  if (policy === TICKET_CANCEL_POLICY.FREE) {
    return `Annulation gratuite (≥ ${TICKET_BUSINESS_RULES.cancelFreeBeforeHours} h avant le voyage).`
  }
  if (policy === TICKET_CANCEL_POLICY.PENALTY) {
    return `Annulation à moins de ${TICKET_BUSINESS_RULES.cancelFreeBeforeHours} h : pénalité de ${TICKET_BUSINESS_RULES.cancelPenaltyUsd} USD à encaisser.`
  }
  return `Dans les ${TICKET_BUSINESS_RULES.noshowWithinHours} h avant embarquement : billet caduc (noshow). Annulation impossible.`
}

export function canCancelTicketByPolicy(
  ticket: TicketTravelInput,
  now: Date = new Date(),
): boolean {
  if (ticket.canCancel === false) return false
  if (ticket.canCancel === true) return true
  return getTicketCancelPolicy(ticket, now) !== TICKET_CANCEL_POLICY.NOSHOW
}

export function getTicketRefundPreviewAmount(ticket: TicketTravelInput): number {
  if (ticket.refundPreviewAmount != null && ticket.refundPreviewAmount !== '') {
    return parseFloat(String(ticket.refundPreviewAmount).replace(',', '.')) || 0
  }
  const paid = parseFloat(String(ticket.paidAmount ?? '').replace(',', '.')) || 0
  const total = parseFloat(String(ticket.totalAmount ?? '').replace(',', '.')) || 0
  const base = paid > 0.001 ? paid : total
  return Math.round(base * TICKET_BUSINESS_RULES.refundRate * 100) / 100
}

/** #1 — preview frais débarquement (pas de process offload dédié pour l’instant). */
export function getTicketOffloadFeePreviewAmount(ticket: TicketTravelInput): number {
  if (ticket.offloadFeePreviewAmount != null && ticket.offloadFeePreviewAmount !== '') {
    return parseFloat(String(ticket.offloadFeePreviewAmount).replace(',', '.')) || 0
  }
  const total = parseFloat(String(ticket.totalAmount ?? '').replace(',', '.')) || 0
  return Math.round(total * TICKET_BUSINESS_RULES.offloadFeeRate * 100) / 100
}
