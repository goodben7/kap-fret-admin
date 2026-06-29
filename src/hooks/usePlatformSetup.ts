import { useMemo } from 'react'
import { useIssuingOffices } from '@/hooks/useIssuingOffices'
import type { IssuingOffice } from '@/types/issuing-office'

export interface PlatformSetupStatus {
  isLoading: boolean
  offices: IssuingOffice[]
  needsOffice: boolean
  officePendingAdmin: IssuingOffice | null
  needsSetup: boolean
  isComplete: boolean
}

export function usePlatformSetupStatus(): PlatformSetupStatus {
  const { data, isLoading } = useIssuingOffices({ itemsPerPage: 100, page: 1 })

  return useMemo(() => {
    const offices = data?.items ?? []
    const needsOffice = offices.length === 0
    const officePendingAdmin = offices.find((office) => !office.adminAccountCreated) ?? null
    const needsSetup = needsOffice || officePendingAdmin != null
    const isComplete = offices.length > 0 && officePendingAdmin == null

    return {
      isLoading,
      offices,
      needsOffice,
      officePendingAdmin,
      needsSetup,
      isComplete,
    }
  }, [data?.items, isLoading])
}
