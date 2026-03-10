import { environment } from '../../environments/environment';
import { NavHeaderLink, NavLink, ThemeConfig } from './theme.interfaces';

const domeHeaderLinks: NavLink[] = [

  {
    label: 'HEADER._forCustomers',
    url: 'https://onboard.sbx.evidenceledger.eu/register-customer'

  },
  {
    label: 'HEADER._forProviders',
    url: 'https://onboard.sbx.evidenceledger.eu/register-provider'
  },
  {
    id: 'dropdown-marketplace',
    label: 'HEADER._marketplaceH',
    children: [{
      label: 'HEADER._browse_serv',
      url: '/search',
      isRouterLink: true,
    },
    {
      label: 'HEADER._catalogs',
      url: '/catalogues',
      isRouterLink: true
    }
    ]
  },
  {
    label: 'HEADER._resources',
    url: 'https://knowledgebase.dome-marketplace-prd.org/'
  },

  {
    label: 'HEADER._blog',
    url: '/blog',
    isRouterLink: true
  },
];


const domeFooterLinks: NavHeaderLink[] = [
  {
    label: 'FOOTER.aboutTitle',
    navLinks: [
      { label: 'FOOTER.domeProject', url: 'https://dome-project.eu/', isRouterLink: false },
      { label: 'FOOTER.contactUs', url: '/contact-us', isRouterLink: true }
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
  },

  {
    label: 'FOOTER.legalTitle',
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

  }

];


export const DOME_THEME_CONFIG: ThemeConfig = {
  name: 'DOME',
  displayName: 'Dome Marketplace',
  browserTitle: 'DOME Marketplace',
  assets: {
    logoUrl: 'assets/themes/dome/dome-logo.svg',
    faviconUrl: 'assets/dome_logo.PNG',
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
