export type Filter = {
  name: string
  label?: string
  clientSide?: boolean
  source?: 'configured' | 'categoryRoot'
  rootName?: string
  children?: Filter[]
}

export type PrimaryCategoriesMode = 'rooted' | 'catalogFirstLevel'

export const searchCategoriesConfig: {
  primaryCategoriesMode: PrimaryCategoriesMode
  primaryRootName: string
} = {
  primaryCategoriesMode: 'rooted',
  primaryRootName: 'DOME Categories',
}

export const availableFilters: Filter[] = [
  {
    name: 'delivery_model',
    label: 'Delivery model',
    source: 'categoryRoot',
    rootName: 'Delivery Model',
  },
  {
    name: 'compliance_profile',
    label: 'Compliance level',
    source: 'configured',
    children: [
      { name: 'Baseline' },
      { name: 'Professional' },
      { name: 'Professional+' },
    ],
  },
  {
    name: 'sector',
    label: 'Addressable sector',
    source: 'categoryRoot',
    rootName: 'Sector',
  },
  {
    name: 'procurement_type',
    label: 'Procurement type',
    source: 'configured',
    clientSide: true,
    children: [
      { name: 'Ready to Buy' },
      { name: 'Request Quote' },
    ],
  },
  {
    name: 'framework',
    label: 'Integration type',
    source: 'categoryRoot',
    rootName: 'Framework',
  },
]

export default availableFilters
