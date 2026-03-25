export type Filter = {
  name: string
  children?: Filter[]
}

const availableFilters: Filter[] = [
  {
    name: 'compliance_profile',
    children: [
      { name: 'Baseline' },
      { name: 'Professional' },
      { name: 'Professional+' },
    ],
  },
]

export default availableFilters
