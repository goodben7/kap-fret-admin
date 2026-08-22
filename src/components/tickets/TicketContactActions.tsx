import type { MouseEvent } from 'react'
import { Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toTelHref, toWhatsAppUrl } from '@/lib/phone'
import { cn } from '@/lib/utils'

interface TicketContactActionsProps {
  phone?: string | null
  passengerName?: string
  size?: 'sm' | 'md'
  className?: string
  /** When used inside a clickable row, stop click bubbling. */
  stopPropagation?: boolean
}

export function TicketContactActions({
  phone,
  passengerName,
  size = 'md',
  className,
  stopPropagation = false,
}: TicketContactActionsProps) {
  const telHref = toTelHref(phone)
  const waUrl = toWhatsAppUrl(
    phone,
    passengerName ? `Bonjour ${passengerName},` : undefined,
  )

  if (!telHref && !waUrl) return null

  const btnClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'

  const stop = (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
  }

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {telHref && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={btnClass}
          asChild
        >
          <a
            href={telHref}
            aria-label="Appeler le passager"
            title="Appeler"
            onClick={stop}
          >
            <Phone className={iconClass} />
          </a>
        </Button>
      )}
      {waUrl && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(btnClass, 'text-emerald-700 hover:text-emerald-800')}
          asChild
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp le passager"
            title="WhatsApp"
            onClick={stop}
          >
            <MessageCircle className={iconClass} />
          </a>
        </Button>
      )}
    </div>
  )
}
