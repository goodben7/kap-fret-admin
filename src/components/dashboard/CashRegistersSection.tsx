import { Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/utils'
import { CURRENCY, type Currency } from '@/constants/ticket'
import type { AppStats } from '@/types/stats'

interface CashRegistersSectionProps {
  cashRegisters: AppStats['cashRegisters']
}

export function CashRegistersSection({ cashRegisters }: CashRegistersSectionProps) {
  const { totalsByCurrency, registers } = cashRegisters
  const visibleCurrencies = (
    Object.keys(totalsByCurrency).length > 0
      ? (Object.keys(totalsByCurrency) as Currency[])
      : [CURRENCY.CDF, CURRENCY.USD]
  )

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${visibleCurrencies.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {visibleCurrencies.map((currency) => {
          const balance = totalsByCurrency[currency]
          const amount = parseFloat(balance ?? '') || 0
          return (
            <Card key={currency} className="rounded-2xl border-border/80 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Solde total {currency}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-brand-orange">
                    {formatMoney(amount, currency)}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10">
                  <Wallet className="h-5 w-5 text-brand-orange" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Caisses actives</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {registers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune caisse active</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {registers.map((register) => {
                const usd = parseFloat(register.currentBalanceUSD) || 0
                const cdf = parseFloat(register.currentBalanceCDF) || 0
                return (
                  <div
                    key={register.id}
                    className="rounded-xl border border-border/60 bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{register.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{register.id}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-lg font-bold tabular-nums text-brand-orange">
                        {formatMoney(usd, CURRENCY.USD)}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-brand-orange">
                        {formatMoney(cdf, CURRENCY.CDF)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
