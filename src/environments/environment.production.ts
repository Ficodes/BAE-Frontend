export const environment = {
    BASE_URL: '',
    LEGACY_PREFIX: '/ux',
    PRODUCT_CATALOG: '/catalog',
    SERVICE: '/service',
    RESOURCE: '/resource',
    PRODUCT_SPEC: '/productSpecification',
    SERVICE_SPEC: '/serviceSpecification',
    RESOURCE_SPEC: '/resourceSpecification',
    ACCOUNT: '/account',
    SHOPPING_CART: '/shoppingCart',
    INVENTORY: '/inventory',
    PRODUCT_ORDER: '/ordering',
    //API PAGINATION
    PRODUCT_LIMIT: 6,
    CATALOG_LIMIT: 8,
    INVENTORY_LIMIT: 6,
    INVENTORY_RES_LIMIT: 8,
    INVENTORY_SERV_LIMIT: 8,
    PROD_SPEC_LIMIT: 6,
    SERV_SPEC_LIMIT: 6,
    RES_SPEC_LIMIT: 6,
    ORDER_LIMIT: 6,
    CATEGORY_LIMIT: 100,
    SIOP: true,
    //SIOP: false,
    TAX_RATE: 20,
    CHAT_API: 'https://eng-gpt.dome-marketplace-dev.org/predict',
    SIOP_INFO: {
        enabled: false,
        isRedirection: false,
        pollPath: "",
        pollCertPath: "",
        clientID: "",
        callbackURL: "",
        verifierHost: "",
        verifierQRCodePath: "",
        requestUri: ""
    },
    MATOMO_TRACKER_URL: "",
    MATOMO_SITE_ID: "",
    TICKETING_SYSTEM_URL: "",
    KNOWLEDGE_BASE_URL: "",
    SEARCH_ENABLED: true,
    PURCHASE_ENABLED: false,
    DOME_TRUST_LINK: "https://dome-certification.dome-marketplace.org",
    DOME_ABOUT_LINK: '',
    DOME_REGISTER_LINK: '',
    DOME_PUBLISH_LINK:''
};
