export type FilterOption = {
  name: string
  label?: string
}

export type Filter = {
  name: string
  label?: string
  source?: 'configured' | 'categoryRoot'
  rootName?: string
  children?: FilterOption[]
}

export type PrimaryCategoriesMode = 'rooted' | 'catalogFirstLevel'

export const searchCategoriesConfig: {
  primaryCategoriesMode: PrimaryCategoriesMode
  primaryRootName: string
} = {
  primaryCategoriesMode: 'catalogFirstLevel',
  primaryRootName: '',
}

const DEFAULT_SEARCH_CATEGORIES_CONFIG: {
  primaryCategoriesMode: PrimaryCategoriesMode
  primaryRootName: string
} = {
  primaryCategoriesMode: 'catalogFirstLevel',
  primaryRootName: '',
}

const DEFAULT_AVAILABLE_FILTERS: Filter[] = []

export const availableFilters: Filter[] = cloneFilters(DEFAULT_AVAILABLE_FILTERS)

type RuntimeSearchFiltersConfig = {
  primaryCategoriesMode?: unknown
  primaryRootName?: unknown
  filters?: unknown
}

function cloneFilters(filters: Filter[]): Filter[] {
  return (filters || []).map(filter => ({
    ...filter,
    children: filter.children
      ? filter.children.map(child => ({
          name: child.name,
          label: child.label,
        }))
      : undefined,
  }))
}

function normalizeFilterOption(raw: any): FilterOption | null {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || raw.name.trim() === '') {
    return null
  }

  return {
    name: raw.name.trim(),
    label: typeof raw.label === 'string' ? raw.label : undefined,
  }
}

function normalizeFilter(raw: any): Filter | null {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || raw.name.trim() === '') {
    return null
  }

  const source = raw.source === 'categoryRoot' ? 'categoryRoot' : 'configured'
  const filter: Filter = {
    name: raw.name.trim(),
    label: typeof raw.label === 'string' ? raw.label : undefined,
    source,
    rootName: source === 'categoryRoot' && typeof raw.rootName === 'string' ? raw.rootName : undefined,
    children: source === 'configured' && Array.isArray(raw.children)
      ? raw.children.map(normalizeFilterOption).filter((child: FilterOption | null): child is FilterOption => !!child)
      : undefined,
  }

  return filter
}

function getRuntimeSearchFiltersConfig(config: any): RuntimeSearchFiltersConfig | undefined {
  if (!config || typeof config !== 'object') {
    return undefined
  }

  return config.searchFilters
}

export function applyRuntimeSearchFiltersConfig(config: any): void {
  const runtimeConfig = getRuntimeSearchFiltersConfig(config)

  const nextMode = runtimeConfig?.primaryCategoriesMode === 'rooted'
    ? 'rooted'
    : 'catalogFirstLevel'

  if (nextMode === 'catalogFirstLevel') {
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel'
    searchCategoriesConfig.primaryRootName = ''
    availableFilters.splice(0, availableFilters.length, ...cloneFilters(DEFAULT_AVAILABLE_FILTERS))
    return
  }

  const nextRootName = typeof runtimeConfig?.primaryRootName === 'string'
    ? runtimeConfig.primaryRootName.trim()
    : DEFAULT_SEARCH_CATEGORIES_CONFIG.primaryRootName

  searchCategoriesConfig.primaryCategoriesMode = 'rooted'
  searchCategoriesConfig.primaryRootName = nextRootName

  const rawFilters = runtimeConfig?.filters
  const normalizedFilters = Array.isArray(rawFilters)
    ? rawFilters.map(normalizeFilter).filter((filter): filter is Filter => !!filter)
    : []

  const nextFilters = normalizedFilters.length > 0
    ? normalizedFilters
    : DEFAULT_AVAILABLE_FILTERS

  availableFilters.splice(0, availableFilters.length, ...cloneFilters(nextFilters))
}

export default availableFilters
