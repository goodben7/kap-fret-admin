import { useCallback, useEffect, useState } from 'react'
import { AsyncSelect } from './async-select'
import { checkpointService } from '@/services/checkpoint.service'
import { checkpointToSelectOption, getCheckpointId } from '@/lib/checkpoint'
import { normalizeIri } from '@/lib/hydra'
import type { CheckpointSelectOption } from '@/lib/checkpoint'

interface CheckpointAsyncSelectProps {
  value?: string
  onChange: (iri: string) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  initialCheckpointIri?: string
  variant?: 'default' | 'filter'
}

export function CheckpointAsyncSelect({
  value,
  onChange,
  label,
  placeholder = 'Rechercher un checkpoint...',
  error,
  disabled,
  initialCheckpointIri,
  variant,
}: CheckpointAsyncSelectProps) {
  const [prefetchedOptions, setPrefetchedOptions] = useState<CheckpointSelectOption[]>([])
  const [selectedOption, setSelectedOption] = useState<CheckpointSelectOption | null>(null)

  // Charge toute la liste au montage (comme la page admin)
  useEffect(() => {
    let cancelled = false
    void checkpointService.searchForSelect('').then(({ items }) => {
      if (cancelled) return
      setPrefetchedOptions(items.map(checkpointToSelectOption))
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Label du checkpoint déjà sélectionné (édition)
  useEffect(() => {
    if (!initialCheckpointIri) return

    const normalized = normalizeIri(initialCheckpointIri)
    const fromPrefetch = prefetchedOptions.find(
      (opt) => normalizeIri(opt.value) === normalized,
    )
    if (fromPrefetch) {
      setSelectedOption(fromPrefetch)
      return
    }

    const id = getCheckpointId(initialCheckpointIri)
    if (!id) return

    let cancelled = false
    void checkpointService.getById(id).then((cp) => {
      if (cancelled) return
      setSelectedOption(checkpointToSelectOption(cp))
    }).catch(() => {
      if (cancelled) return
      setSelectedOption({ value: normalized, label: id })
    })

    return () => {
      cancelled = true
    }
  }, [initialCheckpointIri, prefetchedOptions])

  const loadOptions = useCallback(async (search: string): Promise<CheckpointSelectOption[]> => {
    const { items } = await checkpointService.searchForSelect(search)
    return items.map(checkpointToSelectOption)
  }, [])

  return (
    <AsyncSelect
      value={value}
      onChange={onChange}
      loadOptions={loadOptions}
      prefetchedOptions={prefetchedOptions}
      selectedOption={selectedOption}
      onSelectedOptionChange={setSelectedOption}
      label={label}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      variant={variant}
    />
  )
}
