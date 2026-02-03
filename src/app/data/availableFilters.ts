export type Filter = {
  name: string
  children?: Filter[]
}

const availableFilters: Filter[] = [
  {
    name: 'technical_approach',
    children: [
      {
        name: 'Infrastructure as a Service (IaaS)',
        children: [
          { name: 'Compute' },
          { name: 'Network' },
          { name: 'Storage' },
          { name: 'Security' },
        ],
      },
      { name: 'Container as a Service (CaaS)' },
      {
        name: 'Platform as a Service (PaaS)',
        children: [
          { name: 'Database' },
          { name: 'Development and Testing' },
          { name: 'Business Analytics' },
          { name: 'Process management' },
          { name: 'Knowledge management' },
          { name: 'Data management' },
        ],
      },
      { name: 'Software as a Service (SaaS)' },
      { name: 'Artificial Intelligence and Machine Learning' },
      {
        name: 'Data as a Service (DaaS)',
        children: [{ name: 'Data product distribution and exchange' }],
      },
      { name: 'Cybersecurity and Data Privacy' },
      { name: 'Internet of Things (IoT)' },
    ],
  },
  {
    name: 'business_domain',
    children: [
      { name: 'Automotive' },
      { name: 'Agriculture, Forestry, Fishing' },
      { name: 'Blockchain (DLT)' },
      { name: 'Beauty and Perfume' },
      { name: 'Cleaning and Facility Management Services' },
      {
        name: 'Community Groups, Social, Political and Religious',
        children: [{ name: 'Governmental Administration and Regulation' }],
      },
      { name: 'Education' },
      { name: 'Construction' },
      { name: 'Employment, Recruitment, HR' },
      {
        name: 'Energy and Utility Suppliers',
        children: [
          { name: 'Electricity' },
          { name: 'Gas' },
          { name: 'Waste Collection, Treatment and Disposal Activities' },
          { name: 'Water Supply' },
        ],
      },
      { name: 'Financial Services and Insurance' },
      { name: 'Healthcare' },
      { name: 'IT' },
      { name: 'Leisure and Entertainment' },
      { name: 'Legal, Public Order, Security' },
      {
        name: 'Manufacturing',
        children: [{ name: 'Manufacturing of Metal Products' }, { name: 'Other (manufacturing)' }],
      },
      { name: 'Mining and Drilling' },
      { name: 'Project Management, Marketing and Admin' },
      { name: 'Personal Services' },
      { name: 'Restaurants, Bars, Cafes, Catering' },
      { name: 'Real Estate' },
      { name: 'Publishing, Printing and Photography' },
      { name: 'Tourism and Accommodation' },
      { name: 'Science and Engineering' },
      { name: 'Trade' },
      {
        name: 'Transportation and Transportation infrastructure',
        children: [
          { name: 'Transport of Freight' },
          { name: 'Transport of Persons' },
          { name: 'Other' },
        ],
      },
    ],
  },
  {
    name: 'professional_services',
    children: [
      { name: 'Implementation Services' },
      { name: 'Consulting' },
      {
        name: 'Service Management',
        children: [{ name: 'Operations' }, { name: 'Maintenance' }, { name: 'Governance' }],
      },
    ],
  },
  {
    name: 'lifecycle_status',
    children: [{ name: 'Launched' }, { name: 'Active' }],
  },
  {
    name: 'recurring_charge_period_type',
    children: [{ name: 'YEARLY' }, { name: 'MONTHLY' }],
  },
  {
    name: 'compliance_profile',
    children: [
      { name: 'ISO 22301:2019' },
      { name: 'ISO/IEC 19086-4:2019' },
      { name: 'ISO/IEC 20000-1:2018' },
      { name: 'ISO/IEC 27000:2018' },
      { name: 'ISO/IEC 27001:2022' },
      { name: 'ISO/IEC 27002:2022' },
      { name: 'ISO/IEC 27017:2015' },
      { name: 'ISO/IEC 27018:2019' },
      { name: 'ISO/IEC 27701:2019' },
    ],
  },
]

export default availableFilters
