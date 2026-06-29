import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeIri } from '@/lib/hydra'
import { LoadingSpinner } from './loading-spinner'

export interface AsyncSelectOption {
  value: string
  label: string
}

interface AsyncSelectProps {
  value?: string
  onChange: (value: string) => void
  loadOptions: (search: string) => Promise<AsyncSelectOption[]>
  prefetchedOptions?: AsyncSelectOption[]
  selectedOption?: AsyncSelectOption | null
  onSelectedOptionChange?: (option: AsyncSelectOption | null) => void
  initialOptions?: AsyncSelectOption[]
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  variant?: 'default' | 'filter'
}

export function AsyncSelect({
  value,
  onChange,
  loadOptions,
  prefetchedOptions,
  selectedOption: selectedOptionProp,
  onSelectedOptionChange,
  initialOptions,
  label,
  placeholder = 'Sélectionner...',
  error,
  disabled,
  variant = 'default',
}: AsyncSelectProps) {
  const isFilter = variant === 'filter'
  const [options, setOptions] = useState<AsyncSelectOption[]>([])
  const [internalSelected, setInternalSelected] = useState<AsyncSelectOption | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const requestIdRef = useRef(0)
  const normalizedValue = value ? normalizeIri(value) : ''

  const selectedOption = selectedOptionProp ?? internalSelected
  const setSelectedOption = onSelectedOptionChange ?? setInternalSelected

  useEffect(() => {
    if (!normalizedValue) {
      setSelectedOption(null)
      return
    }
    const pools = [...(prefetchedOptions ?? []), ...(initialOptions ?? []), ...options]
    const known = pools.find((o) => normalizeIri(o.value) === normalizedValue)
    if (known) setSelectedOption(known)
  }, [normalizedValue, value, prefetchedOptions, initialOptions, options, setSelectedOption])

  const fetchOptions = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setLoadError(false)
    try {
      const result = await loadOptions(query)
      if (requestId !== requestIdRef.current) return
      setOptions(result)
    } catch {
      if (requestId !== requestIdRef.current) return
      setOptions([])
      setLoadError(true)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [loadOptions])

  useEffect(() => {
    if (!isOpen) return

    const delay = search.trim() ? 300 : 0
    const timer = setTimeout(() => {
      void fetchOptions(search.trim())
    }, delay)

    return () => clearTimeout(timer)
  }, [isOpen, search, fetchOptions])

  const handleToggle = () => {
    if (disabled) return
    if (isOpen) {
      setIsOpen(false)
      setSearch('')
      return
    }
    setIsOpen(true)
  }

  const handleSelect = (opt: AsyncSelectOption) => {
    setSelectedOption(opt)
    onChange(opt.value)
    setSearch('')
    setIsOpen(false)
  }

  const displayLabel =
    selectedOption && normalizeIri(selectedOption.value) === normalizedValue
      ? selectedOption.label
      : undefined

  const visibleOptions = useMemo(() => {
    const byValue = new Map<string, AsyncSelectOption>()
    for (const opt of [...(prefetchedOptions ?? []), ...(initialOptions ?? []), ...options]) {
      if (!opt.value) continue
      byValue.set(normalizeIri(opt.value), opt)
    }
    return Array.from(byValue.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'fr'),
    )
  }, [prefetchedOptions, initialOptions, options])

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return visibleOptions
    return visibleOptions.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [visibleOptions, search])

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="text-sm font-medium">{label}</label>}
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between text-sm transition-colors',
          isFilter
            ? 'h-11 rounded-xl border border-transparent bg-muted/40 px-3.5 font-medium hover:bg-muted/60'
            : 'h-10 rounded-md border border-input bg-background px-3 py-2',
          error && 'border-destructive',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && isFilter && 'border-input bg-background ring-2 ring-ring/20',
        )}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className={cn('truncate text-left', !displayLabel && 'text-muted-foreground font-normal')}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-1.5 w-full border bg-background shadow-lg overflow-hidden',
          isFilter ? 'rounded-xl' : 'rounded-md',
        )}>
          <input
            type="text"
            className="w-full border-b bg-muted/30 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {isLoading && filteredOptions.length === 0 ? (
              <div className="p-4"><LoadingSpinner size="sm" label="" /></div>
            ) : loadError && filteredOptions.length === 0 ? (
              <p className="p-3 text-sm text-destructive">Impossible de charger les checkpoints</p>
            ) : filteredOptions.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {search.trim() ? 'Aucun résultat' : 'Aucun checkpoint disponible'}
              </p>
            ) : (
              filteredOptions.map((opt, index) => (
                <button
                  key={`${normalizeIri(opt.value)}-${index}`}
                  type="button"
                  className={cn(
                    'w-full px-3.5 py-3 text-left text-sm active:bg-accent/80 hover:bg-accent',
                    normalizeIri(opt.value) === normalizedValue && 'bg-primary/10 text-primary font-medium',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
