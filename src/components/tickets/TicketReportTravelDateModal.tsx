import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  ticketReportTravelDateSchema,
  type TicketReportTravelDateFormData,
} from '@/schemas/ticket-report-travel-date.schema'
import { parseTravelDate } from '@/lib/ticket'
import type { Ticket } from '@/types/ticket'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface TicketReportTravelDateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  onSubmit: (data: TicketReportTravelDateFormData) => Promise<void>
  isLoading?: boolean
}

export function TicketReportTravelDateModal({
  open,
  onOpenChange,
  ticket,
  onSubmit,
  isLoading,
}: TicketReportTravelDateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketReportTravelDateFormData>({
    resolver: zodResolver(ticketReportTravelDateSchema),
    defaultValues: {
      travelDate: parseTravelDate(ticket.travelDate),
      travelTime: ticket.travelTime,
      comment: '',
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) {
      reset({
        travelDate: parseTravelDate(ticket.travelDate),
        travelTime: ticket.travelTime,
        comment: '',
      })
    }
    onOpenChange(next)
  }

  const submit = handleSubmit(async (data) => {
    await onSubmit(data)
    reset({
      travelDate: parseTravelDate(data.travelDate),
      travelTime: data.travelTime,
      comment: '',
    })
    onOpenChange(false)
  })

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Reporter la date de voyage"
      description={`Billet ${ticket.ticketNumber} — ${ticket.passengerName}`}
      className="rounded-2xl sm:max-w-md"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Input
          label="Nouvelle date de voyage"
          type="date"
          error={errors.travelDate?.message}
          disabled={isLoading}
          className={fieldClass}
          {...register('travelDate')}
        />
        <Input
          label="Nouvelle heure de voyage"
          type="time"
          error={errors.travelTime?.message}
          disabled={isLoading}
          className={fieldClass}
          {...register('travelTime')}
        />
        <Input
          label="Commentaire"
          placeholder="Motif du report..."
          error={errors.comment?.message}
          disabled={isLoading}
          className={fieldClass}
          {...register('comment')}
        />
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              <>
                <CalendarClock className="h-4 w-4" />
                Confirmer
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
