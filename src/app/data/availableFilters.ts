export type Filter = {
  name: string
  label?: string
  clientSide?: boolean
  children?: Filter[]
}

export const availableFilters: Filter[] = [
  {
    name: 'compliance_profile',
    label: 'Compliance level',
    children: [
      { name: 'Baseline' },
      { name: 'Professional' },
      { name: 'Professional+' },
    ],
  },
  {
    name: 'procurement_type',
    label: 'Procurement type',
    clientSide: true,
    children: [
      { name: 'Ready to Buy' },
      { name: 'Request Quote' },
    ],
  },
]

export default availableFilters
