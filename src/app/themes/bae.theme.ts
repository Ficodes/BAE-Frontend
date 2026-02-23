import { NavLink, ThemeConfig } from './theme.interfaces';

const baeHeaderLinks: NavLink[] = [
  {
    label: 'HEADER._home',
    url: '/dashboard',
    isRouterLink: true
  },
  {
    label: 'HEADER._browse',
    id: 'searchDropdown', // ID para el toggle de Flowbite
    children: [
      { label: 'HEADER._services', url: '/search', isRouterLink: true },
      { label: 'HEADER._catalogs', url: '/catalogues', isRouterLink: true }
    ]
  }
];


export const BAE_THEME_CONFIG: ThemeConfig = {
  name: 'BAE',
  displayName: 'BAE Default Theme',
  isDefault: true,
  assets: {
    logoUrl: 'assets/themes/bae/bae-logo.svg',
    jumboBgUrl: 'assets/themes/bae/jumboBackground.png',
    cardDefaultBgUrl: 'assets/themes/bae/cardBackground.svg'
  },
  links: {
    headerLinks: baeHeaderLinks,

    linkedin: 'https://linkedin.com/company/ocean-theme-example',
    youtube: 'https://youtube.com/c/ocean-theme-example',
    twitter: 'https://twitter.com/ocean-theme-example',
  },
  dashboard: {
    showFeaturedOfferings: true,
    showPlatformBenefits: false,
  }
};
