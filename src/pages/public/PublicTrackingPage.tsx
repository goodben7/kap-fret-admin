import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLookupPublicReservation } from '@/hooks/usePublicReservation'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/constants/ticket'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PublicReservationResult } from '@/services/public-reservation.service'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

function statusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status
}

export function PublicTrackingPage() {
  const lookup = useLookupPublicReservation()
  const [phone, setPhone] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [result, setResult] = useState<PublicReservationResult | null>(null)

  const canSubmit = phone.trim().length >= 8 && trackingCode.trim().length >= 4

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    try {
      const data = await lookup.mutateAsync({
        phone: phone.trim(),
        trackingCode: trackingCode.trim().toUpperCase(),
      })
      setResult(data)
    } catch {
      /* toast via mutation onError */
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma réservation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez le téléphone de contact et le code de suivi reçus à la réservation.
        </p>
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Retrouver une réservation</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <Input
              label="Téléphone"
              type="tel"
              className={fieldClass}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setResult(null)
              }}
              placeholder="+243 …"
              autoComplete="tel"
            />
            <Input
              label="Code de suivi"
              className={fieldClass}
              value={trackingCode}
              onChange={(e) => {
                setTrackingCode(e.target.value.toUpperCase())
                setResult(null)
              }}
              placeholder="Ex. AB12CD"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-brand-orange hover:bg-brand-orange/90"
              disabled={!canSubmit || lookup.isPending}
            >
              <Search className="h-4 w-4" />
              {lookup.isPending ? 'Recherche…' : 'Rechercher'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-2xl border-brand-orange/30 bg-brand-orange/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {result.count} billet{result.count > 1 ? 's' : ''} trouvé
              {result.count > 1 ? 's' : ''}
            </CardTitle>
            {result.trackingCode && (
              <p className="font-mono text-sm tracking-widest text-brand-orange">
                {result.trackingCode}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {result.message && (
              <p className="text-sm text-muted-foreground">{result.message}</p>
            )}
            <ul className="space-y-2">
              {result.tickets.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-border/60 bg-background px-3 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{t.passengerName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-medium">
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {[
                        t.travelDate,
                        t.travelTime?.slice(0, 5),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Date à confirmer'}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(parseFloat(t.totalAmount) || 0, t.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Présentez-vous au bureau KAP FRET avec ce code pour régler et obtenir vos billets.
            </p>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <Link to="/reserver">Nouvelle réservation</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
