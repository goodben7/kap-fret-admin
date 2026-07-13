import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HydraCollection } from '@/types/hydra'
import type { HydraResource } from '@/types/hydra'
import { extractHydraMember } from '@/lib/hydra'
import { api } from '@/services/api'
import { LoadingSpinner } from './loading-spinner'

interface HydraAutocompleteProps<T extends HydraResource> {
  endpoint: string
  value?: T | null
  onSelect: (item: T) => void
  onClear?: () => void
  label?: string
  placeholder?: string
  searchParam?: string
  searchParams?: string[]
  getLabel: (item: T) => string
  error?: string
  inputClassName?: string
}

export function HydraAutocomplete<T extends HydraResource>({
  endpoint,
  value = null,
  onSelect,
  onClear,
  label,
  placeholder = 'Rechercher...',
  searchParam = 'ticketNumber',
  searchParams,
  getLabel,
  error,
  inputClassName,
}: HydraAutocompleteProps<T>) {
  const [selectedItem, setSelectedItem] = useState<T | null>(value)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const resolvedSearchParams = searchParams?.length ? searchParams : [searchParam]

  useEffect(() => {
    setSelectedItem(value)
  }, [value])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setIsLoading(true)
    try {
      const responses = await Promise.all(
        resolvedSearchParams.map((param) =>
          api.get<HydraCollection<T>>(endpoint, {
            params: { [param]: q, itemsPerPage: 10 },
          }),
        ),
      )

      const merged = new Map<string, T>()
      for (const response of responses) {
        for (const item of extractHydraMember(response.data)) {
          merged.set(item['@id'], item)
        }
      }

      setResults(Array.from(merged.values()))
    } catch (error) {
      if (!axios.isCancel(error)) {
        setResults([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, resolvedSearchParams])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => void search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search, isOpen])

  const inputValue = isOpen ? query : (selectedItem ? getLabel(selectedItem) : '')

  const clearSelection = () => {
    if (selectedItem) {
      setSelectedItem(null)
      onClear?.()
    }
  }

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-destructive focus-visible:ring-destructive',
            inputClassName,
          )}
          placeholder={selectedItem && !isOpen ? undefined : placeholder}
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value)
            clearSelection()
            setIsOpen(true)
          }}
          onFocus={() => {
            setIsOpen(true)
            if (selectedItem) {
              setQuery(getLabel(selectedItem))
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false)
              setQuery('')
            }, 150)
          }}
        />
      </div>
      {isOpen && (query || isLoading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
          {isLoading ? (
            <div className="p-4"><LoadingSpinner size="sm" label="" /></div>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Aucun résultat</p>
          ) : (
            results.map((item) => (
              <button
                key={item['@id']}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelectedItem(item)
                  setQuery('')
                  setIsOpen(false)
                  onSelect(item)
                }}
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
