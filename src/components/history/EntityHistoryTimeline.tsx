import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDateTime, cn } from '@/lib/utils'

export interface EntityHistoryEntry {
  id: string
  date: string
  label: string
  actor?: string
  /** `activity` = Log Activity, sinon Log applicatif */
  source: string
}

interface EntityHistoryTimelineProps {
  entries: EntityHistoryEntry[]
  isLoading: boolean
  title?: string
}

export function EntityHistoryTimeline({
  entries,
  isLoading,
  title = 'Historique des actions',
}: EntityHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label="Chargement de l'historique..." />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <History className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          Aucune action enregistrée.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <History className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="relative space-y-0">
          {entries.map((entry, index) => {
            const isActivity = entry.source === 'activity'
            const frameClass = isActivity
              ? 'border-blue-200/90 bg-blue-50/70'
              : 'border-amber-200/90 bg-amber-50/70'
            const badgeClass = isActivity
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-900'
            const dotClass = isActivity ? 'bg-blue-500' : 'bg-amber-500'
            const sourceLabel = isActivity ? 'Log Activity' : 'Log applicatif'

            return (
              <li key={entry.id} className="relative flex gap-4 pb-4 last:pb-0">
                {index < entries.length - 1 && (
                  <span
                    className="absolute left-[5px] top-3 h-[calc(100%-0.5rem)] w-px bg-border"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 mt-5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-background',
                    dotClass,
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-xl border px-3.5 py-3 sm:px-4',
                    frameClass,
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      badgeClass,
                    )}
                  >
                    {sourceLabel}
                  </span>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium leading-snug">{entry.label}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(entry.date)}</p>
                    {entry.actor && (
                      <p className="text-sm text-muted-foreground">
                        Par <span className="font-medium text-foreground">{entry.actor}</span>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
