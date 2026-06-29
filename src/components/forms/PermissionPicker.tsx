import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionPickerProps {
  value: string[]
  onChange: (permissions: string[]) => void
  error?: string
}

function getPermissionGroup(code: string): string {
  const withoutRole = code.replace(/^ROLE_/, '')
  const idx = withoutRole.indexOf('_')
  return idx > 0 ? withoutRole.slice(0, idx) : 'GENERAL'
}

export function PermissionPicker({ value, onChange, error }: PermissionPickerProps) {
  const { data: permissions, isLoading } = usePermissions()
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    if (!permissions) return {}

    const filtered = permissions.filter(
      (p) =>
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.label ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    return filtered.reduce<Record<string, typeof permissions>>((acc, perm) => {
      const group = getPermissionGroup(perm.code)
      if (!acc[group]) acc[group] = []
      acc[group].push(perm)
      return acc
    }, {})
  }, [permissions, search])

  const toggle = (code: string) => {
    onChange(value.includes(code) ? value.filter((p) => p !== code) : [...value, code])
  }

  const toggleGroup = (codes: string[]) => {
    const allSelected = codes.every((c) => value.includes(c))
    if (allSelected) {
      onChange(value.filter((p) => !codes.includes(p)))
    } else {
      onChange(Array.from(new Set([...value, ...codes])))
    }
  }

  if (isLoading) return <LoadingSpinner size="sm" label="Chargement des permissions..." />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Permissions</label>
        <span className="text-xs text-muted-foreground">{value.length} sélectionnée(s)</span>
      </div>

      <Input
        placeholder="Rechercher une permission..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input"
      />

      <div className="max-h-[min(50dvh,20rem)] overflow-y-auto overscroll-contain rounded-xl border border-border/80 p-3 space-y-4 touch-pan-y">
        {Object.entries(grouped).map(([group, perms]) => (
          <div key={group}>
            <button
              type="button"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              onClick={() => toggleGroup(perms.map((p) => p.code))}
            >
              {group} ({perms.length})
            </button>
            <div className="grid gap-2">
              {perms.map((perm) => (
                <label
                  key={perm.code}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors active:scale-[0.99]',
                    value.includes(perm.code)
                      ? 'border-brand-orange/40 bg-brand-orange/5'
                      : 'border-border/80 bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-orange"
                    checked={value.includes(perm.code)}
                    onChange={() => toggle(perm.code)}
                  />
                  <span>
                    <span className="font-mono text-xs block">{perm.code}</span>
                    {perm.label && perm.label !== perm.code && (
                      <span className="text-xs text-muted-foreground">{perm.label}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {!Object.keys(grouped).length && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune permission trouvée</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
