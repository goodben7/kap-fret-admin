import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Package,
  Plane,
  Scale,
  Ticket,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PassengerManifestModal } from '@/components/tickets/PassengerManifestModal'
import { TicketSalesManifestModal } from '@/components/tickets/TicketSalesManifestModal'
import { FreightManifestModal } from '@/components/freight/FreightManifestModal'
import { FlightExpensesModal } from '@/components/reports/FlightExpensesModal'

const cards = [
  {
    title: 'Rentabilité vol',
    description: 'Billets + fret expédié + excédent bagages, séparés. PDF inclus.',
    icon: Wallet,
    to: '/reports/flights/profitability',
  },
  {
    title: 'Formulaire de dépenses',
    description: 'Entrées / sorties USD·CDF pour un vol (modèle papier KAP).',
    icon: FileText,
    action: 'expenses' as const,
  },
  {
    title: 'Manifeste passagers',
    description: 'Liste passagers + catégories + bagages (modèle existant).',
    icon: Ticket,
    action: 'passengers' as const,
  },
  {
    title: 'Manifeste vente billets',
    description: 'Ventes du vol : montants, soldes, sponsors.',
    icon: Scale,
    action: 'sales' as const,
  },
  {
    title: 'Manifeste fret',
    description: 'LTA du trajet / date (expéditions).',
    icon: Package,
    action: 'freight' as const,
  },
]

export function FlightReportsHubPage() {
  const [expensesOpen, setExpensesOpen] = useState(false)
  const [passengersOpen, setPassengersOpen] = useState(false)
  const [salesOpen, setSalesOpen] = useState(false)
  const [freightOpen, setFreightOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6 lg:max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link to="/admin/cash-registers" aria-label="Retour finance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Plane className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Rapports vol</h1>
          </div>
          <p className="mt-1 pl-11 text-sm text-muted-foreground">
            Rentabilité, dépenses et manifestes pour un même vol
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          const content = (
            <CardContent className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-brand-orange">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{card.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </div>
            </CardContent>
          )

          if ('to' in card && card.to) {
            return (
              <Link key={card.title} to={card.to} className="block">
                <Card className="rounded-2xl border-border/80 shadow-sm transition-colors hover:border-brand-orange/40">
                  {content}
                </Card>
              </Link>
            )
          }

          return (
            <button
              key={card.title}
              type="button"
              className="block w-full text-left"
              onClick={() => {
                if (card.action === 'expenses') setExpensesOpen(true)
                if (card.action === 'passengers') setPassengersOpen(true)
                if (card.action === 'sales') setSalesOpen(true)
                if (card.action === 'freight') setFreightOpen(true)
              }}
            >
              <Card className="rounded-2xl border-border/80 shadow-sm transition-colors hover:border-brand-orange/40">
                {content}
              </Card>
            </button>
          )
        })}
      </div>

      <FlightExpensesModal open={expensesOpen} onOpenChange={setExpensesOpen} />
      <PassengerManifestModal open={passengersOpen} onOpenChange={setPassengersOpen} />
      <TicketSalesManifestModal open={salesOpen} onOpenChange={setSalesOpen} />
      <FreightManifestModal open={freightOpen} onOpenChange={setFreightOpen} />
    </div>
  )
}
