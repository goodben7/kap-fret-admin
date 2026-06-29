import { useMemo } from 'react'
import { Select, type SelectOption } from './select'
import type { HydraResource } from '@/types/hydra'
import { extractIri } from '@/lib/hydra'

interface HydraSelectProps<T extends HydraResource & { id?: string | number; name?: string; label?: string }> {
  items: T[]
  value?: string
  onChange: (iri: string) => void
  label?: string
  placeholder?: string
  error?: string
  getLabel?: (item: T) => string
  disabled?: boolean
}

export function HydraSelect<T extends HydraResource & { id?: string | number; name?: string; label?: string }>({
  items,
  value,
  onChange,
  label,
  placeholder,
  error,
  getLabel,
  disabled,
}: HydraSelectProps<T>) {
  const options: SelectOption[] = useMemo(
    () =>
      items.map((item) => ({
        value: extractIri(item['@id']) ?? item['@id'],
        label: getLabel ? getLabel(item) : (item.label ?? item.name ?? item['@id']),
      })),
    [items, getLabel],
  )

  return (
    <Select
      options={options}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      label={label}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
    />
  )
}
