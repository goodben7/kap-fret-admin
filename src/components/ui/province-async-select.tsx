import { useCallback, useEffect, useState } from 'react'
import { AsyncSelect, type AsyncSelectOption } from './async-select'
import { provinceService } from '@/services/province.service'
import { api } from '@/services/api'
import { getProvinceOptionLabel } from '@/lib/province'
import { extractIri } from '@/lib/hydra'
import type { Province } from '@/types/province'

interface ProvinceAsyncSelectProps {
  value?: string
  onChange: (iri: string) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  initialProvinceIri?: string
  variant?: 'default' | 'filter'
}

function toProvinceOption(province: Province): AsyncSelectOption {
  return {
    value: extractIri(province['@id']) ?? province['@id'],
    label: getProvinceOptionLabel(province),
  }
}

export function ProvinceAsyncSelect({
  value,
  onChange,
  label,
  placeholder = 'Rechercher une province...',
  error,
  disabled,
  initialProvinceIri,
  variant,
}: ProvinceAsyncSelectProps) {
  const [initialOptions, setInitialOptions] = useState<AsyncSelectOption[]>([])

  useEffect(() => {
    if (!initialProvinceIri) return

    void api.get<Province>(initialProvinceIri).then((res) => {
      setInitialOptions([toProvinceOption(res.data)])
    }).catch(() => {
      setInitialOptions([{ value: initialProvinceIri, label: initialProvinceIri }])
    })
  }, [initialProvinceIri])

  const loadOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const items = await provinceService.searchForSelect(search)
    return items.map(toProvinceOption)
  }, [])

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
      variant={variant}
    />
  )
}
