import { environment } from '../../environments/environment';
import { NavHeaderLink, NavLink, ThemeConfig } from './theme.interfaces';

const domeHeaderLinks: NavLink[] = [

  {
    label: 'HEADER._forCustomers',
    url: '/landing-page/customers',
    isRouterLink: true
  },
  {
    label: 'HEADER._forProviders',
    url: '/landing-page/providers',
    isRouterLink: true
  },
  {
    label: 'HEADER._marketplaceH',
    children: [{
      label: 'HEADER._browse_serv',
      url: '/browse',
      isRouterLink: true,
    },
    {
      label: 'HEADER._catalogs',
      url: '/catalogues',
      isRouterLink: true
    }
    ]
  },
  // {
  //   label: 'HEADER._resources',
  //   url: 'https://knowledgebase.dome-marketplace-prd.org/'
  // },
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
      { label: 'FOOTER.contactUs', url: '/contact-us', isRouterLink: true },
      { label: 'Feedback' },
      { label: 'Newsletter', url: 'https://www.linkedin.com/newsletters/newsletter-7142535480692133889/', isRouterLink: false }
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
        url: 'landing-page/customers',
        isRouterLink: true
      },
      {
        label: 'FOOTER.forProviders',
        url: 'landing-page/providers',
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
    marketplaceHomeUrl: '/browse',

    linkedin: environment.DOME_LINKEDIN,
    youtube: environment.DOME_YOUTUBE,
    twitter: environment.DOME_X,
    privacyPolicy: 'assets/documents/privacy.pdf',

  },
  dashboard: {
    showFeaturedOfferings: true,
    showPlatformBenefits: true,
  },
  metaTags: [
    { property: 'og:title', content: 'DOME Marketplace - Dashboard' },
    { property: 'og:description', content: 'The European federated ecosystem for secure and trusted Cloud and Edge service procurement.' },
    { property: 'og:image', content: 'https://dome-marketplace.eu' },
    { property: 'og:url', content: 'https://dome-marketplace.eu/dashboard' },
    { property: 'og:type', content: 'website' }
  ]
};
