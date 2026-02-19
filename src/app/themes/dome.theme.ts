import { environment } from '../../environments/environment';
import { NavHeaderLink, NavLink, ThemeConfig } from './theme.interfaces';

const domeHeaderLinks: NavLink[] = [
  {
    label: 'HEADER._verify',
    id: 'verifyDropdown', // ID para el toggle de Flowbite
    children: [
      { id: 'guidelines', label: 'HEADER._guidelines', url: environment.KB_ONBOARDING_GUIDELINES_URL, environmentName: 'KB_ONBOARDING_GUIDELINES_URL', isRouterLink: false },
      { id: 'registration', label: 'HEADER._registration', url: environment.REGISTRATION_FORM_URL, environmentName: 'REGISTRATION_FORM_URL', isRouterLink: false },
      { id: 'guidelinesPublish', label: 'HEADER._guideline_publish', url: environment.KB_GUIDELNES_URL, environmentName: 'KB_GUIDELNES_URL', isRouterLink: false }
    ]
  },
  {
    label: 'HEADER._browse',
    id: 'searchDropdown', // ID para el toggle de Flowbite
    children: [
      { label: 'HEADER._services', url: '/search', isRouterLink: true },
      { label: 'HEADER._catalogs', url: '/catalogues', isRouterLink: true }
    ]
  },
  {
    label: 'HEADER._about',
    url: '/about',
    isRouterLink: true
  },
  {
    label: 'HEADER._blog',
    url: '/blog',
    isRouterLink: true
  },
  {
    label: 'FOOTER._contact',
    url: '/contact-us',
    isRouterLink: true
  }
];


const domeFooterLinks: NavHeaderLink[] = [
  {
    label: 'FOOTER.aboutTitle',
    navLinks: [
      { label: 'FOOTER._about', url: '/about', isRouterLink: true },
      { label: 'FOOTER.governance', url: '/governance', isRouterLink: true },
      { label: 'FOOTER.partners', url: 'https://dome-project.eu/about/#partners', isRouterLink: false },
    ]
  },
  {
    label: 'FOOTER.marketplaceTitle',
    navLinks: [
      {
        label: 'FOOTER.browse',
        url: '/search',
        isRouterLink: true
      },
      {
        label: 'FOOTER.forCustomers',
        url: '#for-customers',
        isRouterLink: true
      },
      {
        label: 'FOOTER.forProviders',
        url: '#for-providers',
        isRouterLink: true
      },
    ],

  },
  {
    label: 'FOOTER.resourcesTitle',
    navLinks: [
      {
        label: 'FOOTER._licensing',
        url: '/assets/documents/terms.pdf',
        isRouterLink: false
      },
      {
        label: 'FOOTER._privacy',
        url: '/assets/documents/privacy.pdf',
        isRouterLink: false
      },
      {
        label: 'FOOTER._cookies',
        url: '/assets/documents/cookies.pdf',
        isRouterLink: false
      },
    ],

  },
  {
    label: 'FOOTER.resourcesTitle',
    navLinks: [
      {
        label: 'FOOTER.documentation',
        url: 'https://knowledgebase.dome-marketplace-prd.org/',
        isRouterLink: false
      },
      {
        label: 'FOOTER.support',
        url: 'https://dome-marketplace.eu/contact-us',
        isRouterLink: false
      }
      , {
        label: 'FOOTER.faqs',
        url: '/faq',
        isRouterLink: true
      }
    ]
  }

];


export const DOME_THEME_CONFIG: ThemeConfig = {
  name: 'DOME',
  displayName: 'Dome Marketplace',
  assets: {
    logoUrl: 'assets/themes/dome/dome-logo.svg',
    jumboBgUrl: 'assets/themes/dome/jumboBackground.png',
    cardDefaultBgUrl: 'assets/themes/dome/cardBackground.png'
  },
  links: {
    headerLinks: domeHeaderLinks,
    footerLinks: domeFooterLinks,
    footerLinksColsNumber: domeFooterLinks.length,

    linkedin: environment.DOME_LINKEDIN,
    youtube: environment.DOME_YOUTUBE,
    twitter: environment.DOME_X,
    privacyPolicy: 'assets/documents/privacy.pdf',

  },
  dashboard: {
    showFeaturedOfferings: true,
    showPlatformBenefits: true,
  }
};
