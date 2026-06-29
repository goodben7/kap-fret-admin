/** Filtres alignés sur Activity SearchFilter + DateFilter + OrderFilter */

export interface ActivityListFilters {
  page?: number
  itemsPerPage?: number
  id?: string
  user?: string
  activity?: string
  ressourceName?: string
  ressourceIdentifier?: string
  triggeredBy?: string
  date?: string
}

export type ActivityFiltersState = {
  ressourceIdentifier: string
  activity: string
  ressourceName: string
  user: string
  triggeredBy: string
  date: string
}

export const emptyActivityFilters: ActivityFiltersState = {
  ressourceIdentifier: '',
  activity: '',
  ressourceName: '',
  user: '',
  triggeredBy: '',
  date: '',
}

const FILTER_PARAM_KEYS = [
  'ressourceIdentifier',
  'activity',
  'ressourceName',
  'user',
  'triggeredBy',
  'date',
] as const satisfies readonly (keyof ActivityFiltersState)[]

function addDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildActivityFilterParams(
  filters: ActivityListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (filters.page != null && filters.page > 0) params.page = filters.page
  if (filters.itemsPerPage != null && filters.itemsPerPage > 0) params.itemsPerPage = filters.itemsPerPage

  if (filters.id?.trim()) params.id = filters.id.trim()
  if (filters.user?.trim()) params.user = filters.user.trim()
  if (filters.activity?.trim()) params.activity = filters.activity.trim()
  if (filters.ressourceName?.trim()) params.ressourceName = filters.ressourceName.trim()
  if (filters.ressourceIdentifier?.trim()) params.ressourceIdentifier = filters.ressourceIdentifier.trim()
  if (filters.triggeredBy?.trim()) params.triggeredBy = filters.triggeredBy.trim()

  const date = filters.date?.trim()
  if (date) {
    params['date[after]'] = `${date}T00:00:00`
    params['date[before]'] = `${addDay(date, 1)}T00:00:00`
  }

  params['order[date]'] = 'desc'

  return params
}

export function activityFiltersStateToApi(
  filters: ActivityFiltersState,
): Omit<ActivityListFilters, 'page' | 'itemsPerPage'> {
  return {
    ressourceIdentifier: filters.ressourceIdentifier.trim() || undefined,
    activity: filters.activity.trim() || undefined,
    ressourceName: filters.ressourceName.trim() || undefined,
    user: filters.user.trim() || undefined,
    triggeredBy: filters.triggeredBy.trim() || undefined,
    date: filters.date.trim() || undefined,
  }
}

export function parseActivityFiltersFromSearchParams(searchParams: URLSearchParams): ActivityFiltersState {
  const get = (key: keyof ActivityFiltersState) => searchParams.get(key) ?? ''
  return {
    ressourceIdentifier: get('ressourceIdentifier'),
    activity: get('activity'),
    ressourceName: get('ressourceName'),
    user: get('user'),
    triggeredBy: get('triggeredBy'),
    date: get('date'),
  }
}

export function activityFiltersToSearchParams(
  filters: ActivityFiltersState,
  page?: number,
): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]?.trim()
    if (value) sp.set(key, value)
  }
  if (page != null && page > 1) sp.set('page', String(page))
  return sp
}

export function countActiveActivityFilters(filters: ActivityFiltersState): number {
  return FILTER_PARAM_KEYS.filter((key) => Boolean(filters[key]?.trim())).length
}
