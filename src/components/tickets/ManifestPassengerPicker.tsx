import { CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/constants/ticket'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'

interface ManifestPassengerPickerProps {
  tickets: Ticket[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
  disabled?: boolean
}

export function ManifestPassengerPicker({
  tickets,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  disabled,
}: ManifestPassengerPickerProps) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
        Aucun passager chargé pour ce trajet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Passagers ({selectedIds.size}/{tickets.length})
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            disabled={disabled}
            onClick={onSelectAll}
          >
            Tout
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg"
            disabled={disabled || selectedIds.size === 0}
            onClick={onClear}
          >
            Aucun
          </Button>
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-2">
        {tickets.map((ticket) => {
          const selected = selectedIds.has(ticket.id)
          return (
            <button
              key={ticket.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(ticket.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                selected
                  ? 'border-brand-orange/40 bg-brand-orange/5'
                  : 'border-transparent bg-background/80 hover:border-border',
                disabled && 'opacity-60',
              )}
            >
              <span className="mt-0.5 text-brand-orange" aria-hidden="true">
                {selected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {ticket.ticketNumber || '—'}
                  </span>
                  {ticket.status && (
                    <Badge variant="outline" className="text-[10px]">
                      {TICKET_STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm font-medium">{ticket.passengerName || '—'}</p>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Décochez les passagers à exclure du manifeste (sans modifier leur date de voyage).
      </p>
    </div>
  )
}
