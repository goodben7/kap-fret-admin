import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { extractApiErrorMessage } from '@/services/api'
import {
  useTicketCategoryPrices,
  useUpdateTicketCategoryPrice,
} from '@/hooks/useTicketCategoryPrices'
import {
  TICKET_CATEGORY,
  TICKET_CATEGORY_LABELS,
  TICKET_CATEGORY_BASE_PRICE_USD,
  type TicketCategory,
} from '@/constants/ticket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney } from '@/lib/utils'
import { CURRENCY } from '@/constants/ticket'

const CATEGORY_ORDER: TicketCategory[] = [
  TICKET_CATEGORY.INF,
  TICKET_CATEGORY.CD,
  TICKET_CATEGORY.AD,
]

export function TicketCategoryPricesPage() {
  const { data, isLoading, isError, refetch } = useTicketCategoryPrices()
  const updatePrice = useUpdateTicketCategoryPrice()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const prices = useMemo(() => {
    const items = data?.items ?? []
    return CATEGORY_ORDER.map((category) => {
      const row = items.find((item) => item.category === category)
      return {
        category,
        id: row?.id,
        basePrice: row?.basePrice ?? TICKET_CATEGORY_BASE_PRICE_USD[category],
        active: row?.active ?? true,
        exists: !!row,
      }
    })
  }, [data?.items])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const row of prices) {
      if (row.id) next[row.id] = row.basePrice
    }
    setDrafts(next)
  }, [prices])

  const handleSave = async (id: string) => {
    const value = drafts[id]?.trim()
    const amount = parseFloat(value?.replace(',', '.') ?? '')
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Le prix doit être supérieur à 0')
      return
    }
    setSavingId(id)
    try {
      await updatePrice.mutateAsync({
        id,
        payload: { basePrice: amount.toFixed(2) },
      })
      toast.success('Tarif mis à jour')
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(extractApiErrorMessage(error.response?.data, error.response?.status))
      } else {
        toast.error('Impossible de mettre à jour le tarif')
      }
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/admin" aria-label="Retour administration">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarifs par catégorie</h1>
          <p className="text-sm text-muted-foreground">
            Prix de base USD préremplis à la création d’un billet (modifiables ensuite).
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement des tarifs..." />
      ) : isError ? (
        <EmptyState
          title="Impossible de charger les tarifs"
          description="Vérifiez les permissions ou relancez la migration backend."
          action={
            <Button type="button" onClick={() => void refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {prices.map((row) => (
            <Card key={row.category} className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                    <Tags className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {TICKET_CATEGORY_LABELS[row.category]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!row.exists || !row.id ? (
                  <p className="text-sm text-muted-foreground">
                    Tarif non trouvé en base — valeur locale :{' '}
                    {formatMoney(parseFloat(row.basePrice) || 0, CURRENCY.USD)}
                  </p>
                ) : (
                  <>
                    <Input
                      label="Prix de base (USD)"
                      inputMode="decimal"
                      value={drafts[row.id] ?? row.basePrice}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.id!]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      className="w-full rounded-xl"
                      disabled={savingId === row.id || updatePrice.isPending}
                      onClick={() => void handleSave(row.id!)}
                    >
                      <Save className="h-4 w-4" />
                      {savingId === row.id ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
