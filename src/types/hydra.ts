export interface HydraResource {
  '@id': string
  '@type': string
}

export interface HydraView {
  '@id'?: string
  '@type'?: string
  'hydra:first'?: string
  'hydra:last'?: string
  'hydra:previous'?: string
  'hydra:next'?: string
}

export interface HydraCollection<T> {
  '@context'?: string
  '@id'?: string
  '@type'?: string
  'hydra:member'?: T[]
  'hydra:totalItems'?: number
  member?: T[]
  totalItems?: number
  'hydra:view'?: HydraView
}

export interface HydraError {
  '@context'?: string
  '@type'?: string
  'hydra:title'?: string
  'hydra:description'?: string
  /** RFC 7807 Problem Details (Symfony / API Platform) */
  title?: string
  detail?: string
  message?: string
  status?: number
  type?: string
  violations?: HydraViolation[]
}

export interface HydraViolation {
  propertyPath: string
  message: string
}

export interface PaginationParams {
  page?: number
  itemsPerPage?: number
}
