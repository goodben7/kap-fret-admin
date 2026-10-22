import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, Trash2, Plane, Users, FileText } from 'lucide-react'
import {
  useCreatePublicReservation,
  usePublicCategoryPrices,
  usePublicCheckpoints,
} from '@/hooks/usePublicReservation'
import {
  GENDER,
  GENDER_LABELS,
  TICKET_CATEGORY,
  TICKET_CATEGORY_LABELS,
  TICKET_CATEGORY_OPTIONS,
  type Gender,
  type TicketCategory,
} from '@/constants/ticket'
import { PASSENGER_CONTRACT_CONDITIONS } from '@/constants/passenger-contract-conditions'
import { checkpointToSelectOption } from '@/lib/checkpoint'
import { normalizeIri } from '@/lib/hydra'
import { getUpcomingFlightTravelDateInput } from '@/lib/ticket'
import { formatMoney, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AsyncSelect, type AsyncSelectOption } from '@/components/ui/async-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { PublicReservationResult } from '@/services/public-reservation.service'

type Step = 1 | 2 | 3

interface PassengerDraft {
  key: string
  passengerName: string
  category: TicketCategory
  gender: Gender
  age: string
  phone: string
}

function emptyPassenger(phone = ''): PassengerDraft {
  return {
    key: crypto.randomUUID(),
    passengerName: '',
    category: TICKET_CATEGORY.AD,
    gender: GENDER.MALE,
    age: '',
    phone,
  }
}

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const steps = [
  { id: 1 as const, label: 'Trajet', icon: Plane },
  { id: 2 as const, label: 'Passagers', icon: Users },
  { id: 3 as const, label: 'Confirmation', icon: FileText },
]

export function PublicReservePage() {
  const { data: checkpoints = [], isLoading: checkpointsLoading } = usePublicCheckpoints()
  const { data: prices = [], isLoading: pricesLoading } = usePublicCategoryPrices()
  const createReservation = useCreatePublicReservation()

  const [step, setStep] = useState<Step>(1)
  const [departure, setDeparture] = useState('')
  const [destination, setDestination] = useState('')
  const [travelDate, setTravelDate] = useState(getUpcomingFlightTravelDateInput())
  const [travelTime, setTravelTime] = useState('08:00')
  const [contactPhone, setContactPhone] = useState('')
  const [passengers, setPassengers] = useState<PassengerDraft[]>([emptyPassenger()])
  const [acceptCgu, setAcceptCgu] = useState(false)
  const [result, setResult] = useState<PublicReservationResult | null>(null)

  const priceByCategory = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of prices) map.set(p.category, p.basePrice)
    return map
  }, [prices])

  const checkpointOptions = useMemo(
    () => checkpoints.map((cp) => checkpointToSelectOption(cp)),
    [checkpoints],
  )

  const checkpointLabel = useCallback(
    (iri: string) =>
      checkpointOptions.find((o) => normalizeIri(o.value) === normalizeIri(iri))?.label ?? '—',
    [checkpointOptions],
  )

  const filterCheckpoints = useCallback(
    async (search: string, excludeIri?: string): Promise<AsyncSelectOption[]> => {
      const q = search.trim().toLowerCase()
      const exclude = excludeIri ? normalizeIri(excludeIri) : ''
      return checkpointOptions.filter((opt) => {
        if (exclude && normalizeIri(opt.value) === exclude) return false
        if (!q) return true
        return opt.label.toLowerCase().includes(q)
      })
    },
    [checkpointOptions],
  )

  const loadDepartureOptions = useCallback(
    (search: string) => filterCheckpoints(search, destination),
    [filterCheckpoints, destination],
  )

  const loadDestinationOptions = useCallback(
    (search: string) => filterCheckpoints(search, departure),
    [filterCheckpoints, departure],
  )

  const estimatedTotal = useMemo(() => {
    return passengers.reduce((sum, p) => {
      const price = parseFloat(priceByCategory.get(p.category) ?? '0') || 0
      return sum + price
    }, 0)
  }, [passengers, priceByCategory])

  const tripValid =
    !!departure
    && !!destination
    && departure !== destination
    && !!travelDate.trim()
    && !!travelTime.trim()
    && !!contactPhone.trim()

  const passengersValid =
    passengers.length > 0
    && passengers.every(
      (p) => p.passengerName.trim().length >= 2 && (p.category === TICKET_CATEGORY.AD || p.gender),
    )

  const updatePassenger = (key: string, patch: Partial<PassengerDraft>) => {
    setPassengers((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  const handleSubmit = async () => {
    if (!acceptCgu || !tripValid || !passengersValid) return
    try {
      const data = await createReservation.mutateAsync({
        phone: contactPhone.trim(),
        departure,
        destination,
        travelDate: travelDate.trim(),
        travelTime: travelTime.trim().length === 5 ? `${travelTime.trim()}:00` : travelTime.trim(),
        currency: 'USD',
        passengers: passengers.map((p) => ({
          passengerName: p.passengerName.trim(),
          category: p.category,
          gender: p.gender,
          age: p.age.trim() ? Number(p.age) : undefined,
          phone: p.phone.trim() || undefined,
        })),
      })
      setResult(data)
    } catch {
      /* toast via mutation onError */
    }
  }

  if (result) {
    return (
      <div className="space-y-5">
        <Card className="rounded-2xl border-brand-orange/30 bg-brand-orange/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-white">
                <Check className="h-4 w-4" />
              </span>
              Réservation enregistrée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{result.message}</p>
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code de suivi
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-orange">
                {result.trackingCode}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Conservez ce code avec le téléphone {contactPhone} pour retrouver votre réservation.
              </p>
            </div>
            <ul className="space-y-2">
              {result.tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{t.passengerName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(parseFloat(t.totalAmount) || 0, t.currency)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Paiement au guichet KAP FRET avant le voyage. Aucun paiement en ligne.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="h-11 flex-1 rounded-xl bg-brand-orange hover:bg-brand-orange/90">
                <Link to="/suivi">Retrouver ma réservation</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => {
                  setResult(null)
                  setStep(1)
                  setPassengers([emptyPassenger()])
                  setAcceptCgu(false)
                }}
              >
                Nouvelle réservation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (checkpointsLoading || pricesLoading) {
    return <LoadingSpinner label="Chargement du portail…" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réserver un billet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Réservez en ligne, payez au bureau KAP FRET. Pas de paiement sur ce site.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {steps.map(({ id, label, icon: Icon }) => (
          <li
            key={id}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium sm:text-sm',
              step === id
                ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
                : step > id
                  ? 'border-border/60 bg-muted/30 text-foreground'
                  : 'border-border/40 text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trajet</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <AsyncSelect
              label="Départ"
              value={departure}
              onChange={(iri) => {
                setDeparture(iri)
                if (destination && normalizeIri(destination) === normalizeIri(iri)) {
                  setDestination('')
                }
              }}
              loadOptions={loadDepartureOptions}
              prefetchedOptions={checkpointOptions.filter(
                (o) => !destination || normalizeIri(o.value) !== normalizeIri(destination),
              )}
              placeholder="Rechercher un départ…"
              variant="filter"
            />
            <AsyncSelect
              label="Destination"
              value={destination}
              onChange={setDestination}
              loadOptions={loadDestinationOptions}
              prefetchedOptions={checkpointOptions.filter(
                (o) => !departure || normalizeIri(o.value) !== normalizeIri(departure),
              )}
              placeholder="Rechercher une destination…"
              variant="filter"
            />
            <Input
              label="Date de voyage"
              type="date"
              className={fieldClass}
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
            <Input
              label="Heure (indicative)"
              type="time"
              className={fieldClass}
              value={travelTime}
              onChange={(e) => setTravelTime(e.target.value)}
            />
            <Input
              label="Téléphone de contact"
              type="tel"
              className={cn(fieldClass, 'sm:col-span-2')}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+243 …"
            />
            <div className="sm:col-span-2">
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                disabled={!tripValid}
                onClick={() => setStep(2)}
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base">Passagers</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setPassengers((prev) => [...prev, emptyPassenger(contactPhone)])}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {passengers.map((p, index) => (
              <div
                key={p.key}
                className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-2"
              >
                <div className="flex items-center justify-between sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Passager {index + 1}
                  </p>
                  {passengers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-destructive"
                      onClick={() =>
                        setPassengers((prev) => prev.filter((x) => x.key !== p.key))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Input
                  label="Nom complet"
                  className={cn(fieldClass, 'sm:col-span-2')}
                  value={p.passengerName}
                  onChange={(e) => updatePassenger(p.key, { passengerName: e.target.value })}
                />
                <Select
                  label="Catégorie"
                  options={TICKET_CATEGORY_OPTIONS}
                  value={p.category}
                  onChange={(e) =>
                    updatePassenger(p.key, { category: e.target.value as TicketCategory })
                  }
                  variant="filter"
                  className={fieldClass}
                />
                <Select
                  label="Genre"
                  options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))}
                  value={p.gender}
                  onChange={(e) => updatePassenger(p.key, { gender: e.target.value as Gender })}
                  variant="filter"
                  className={fieldClass}
                />
                <Input
                  label="Âge (optionnel)"
                  inputMode="numeric"
                  className={fieldClass}
                  value={p.age}
                  onChange={(e) => updatePassenger(p.key, { age: e.target.value })}
                />
                <Input
                  label="Tél. passager (optionnel)"
                  type="tel"
                  className={fieldClass}
                  value={p.phone}
                  onChange={(e) => updatePassenger(p.key, { phone: e.target.value })}
                />
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  {TICKET_CATEGORY_LABELS[p.category]} ·{' '}
                  {formatMoney(parseFloat(priceByCategory.get(p.category) ?? '0') || 0, 'USD')}
                </p>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3">
              <span className="text-sm font-medium">Total estimé</span>
              <span className="text-lg font-bold tabular-nums text-brand-orange">
                {formatMoney(estimatedTotal, 'USD')}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setStep(1)}
              >
                Retour
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                disabled={!passengersValid}
                onClick={() => setStep(3)}
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Récapitulatif & conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">Trajet · </span>
                {checkpointLabel(departure)}
                {' → '}
                {checkpointLabel(destination)}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Date · </span>
                {travelDate} {travelTime}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Contact · </span>
                {contactPhone}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Passagers · </span>
                {passengers.map((p) => p.passengerName.trim() || '—').join(', ')}
              </p>
              <p className="mt-2 font-semibold text-brand-orange">
                Total estimé {formatMoney(estimatedTotal, 'USD')} — à régler au guichet
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
              <ol className="list-decimal space-y-2 pl-4">
                {PASSENGER_CONTRACT_CONDITIONS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border"
                checked={acceptCgu}
                onChange={(e) => setAcceptCgu(e.target.checked)}
              />
              <span>
                J’accepte les conditions du contrat et je m’engage à régler le billet au bureau KAP
                FRET avant le voyage.
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setStep(2)}
                disabled={createReservation.isPending}
              >
                Retour
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                disabled={!acceptCgu || createReservation.isPending}
                onClick={() => void handleSubmit()}
              >
                {createReservation.isPending ? 'Enregistrement…' : 'Confirmer la réservation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
