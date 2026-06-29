import { AsyncSelect, type AsyncSelectOption } from './async-select'
import type { HydraCollection } from '@/types/hydra'
import type { HydraResource } from '@/types/hydra'
import { extractHydraMember, extractIri } from '@/lib/hydra'
import { api } from '@/services/api'

interface HydraAsyncSelectProps<T extends HydraResource & { name?: string; label?: string }> {
  endpoint: string
  value?: string
  onChange: (iri: string) => void
  label?: string
  placeholder?: string
  error?: string
  getLabel?: (item: T) => string
  searchParam?: string
  extraParams?: Record<string, string | number | boolean>
  initialOptions?: AsyncSelectOption[]
  disabled?: boolean
}

export function HydraAsyncSelect<T extends HydraResource & { name?: string; label?: string }>({
  endpoint,
  value,
  onChange,
  label,
  placeholder,
  error,
  getLabel,
  searchParam = 'name',
  extraParams,
  initialOptions,
  disabled,
}: HydraAsyncSelectProps<T>) {
  const loadOptions = async (search: string): Promise<AsyncSelectOption[]> => {
    const params: Record<string, string | number | boolean> = { itemsPerPage: 20, ...extraParams }
    if (search) params[searchParam] = search

    const { data } = await api.get<HydraCollection<T>>(endpoint, { params })
    const items = extractHydraMember(data)

    return items.map((item) => ({
      value: extractIri(item['@id']) ?? item['@id'],
      label: getLabel ? getLabel(item) : (item.label ?? item.name ?? item['@id']),
    }))
  }

  return (
    <AsyncSelect
      value={value}
      onChange={onChange}
      loadOptions={loadOptions}
      initialOptions={initialOptions}
      label={label}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
    />
  )
}
