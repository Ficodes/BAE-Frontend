/**
 *              environment.SIOP_INFO = config.siop;
                environment.CHAT_API = config.chat;
                environment.MATOMO_SITE_ID = config.matomoId;
                environment.MATOMO_TRACKER_URL = config.matomoUrl;
                environment.KNOWLEDGE_BASE_URL = config.knowledgeBaseUrl;
                environment.TICKETING_SYSTEM_URL = config.ticketingUrl;
                environment.SEARCH_ENABLED = config.searchEnabled;
                environment.DOME_TRUST_LINK = config.domeTrust;
                environment.DOME_ABOUT_LINK = config.domeAbout;
                environment.DOME_REGISTER_LINK = config.domeRegister;
                environment.DOME_PUBLISH_LINK = config.domePublish;
                environment.PURCHASE_ENABLED = config.purchaseEnabled;
 */
describe('/dashboard', () => {
  it('should exist login button with the corresponding SIOP configuration', () => {
    cy.intercept( 'GET', 'http://proxy.docker:8004/stats', {}).as('stats')
    cy.intercept( 'GET', 'http://proxy.docker:8004/catalog/productOffering?*', []).as('productOffering')
    cy.intercept( 'GET', 'http://proxy.docker:8004/config', {searchEnabled: true, purchaseEnabled: true, domeRegister: true}).as('config')
    cy.intercept( 'GET', 'http://proxy.docker:8004/catalog/category?*', []).as('category')
    cy.visit('/')
    cy.wait('@stats')
    cy.wait('@config')
    cy.wait('@productOffering')
    cy.wait('@category')
    cy.login().should('exist')
  })
})
