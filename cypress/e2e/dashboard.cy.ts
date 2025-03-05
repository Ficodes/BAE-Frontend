import { category_launched, init_config, init_stat, local_items, product_offering } from "../support/constants"
import * as moment from 'moment';
const checkHeaderPreLogin = () => {
    // Mocks
    cy.intercept( {method:'GET', url: 'http://proxy.docker:8004/stats', times:1}, init_stat).as('stats')
    cy.intercept( {method: 'GET', url: 'http://proxy.docker:8004/catalog/productOffering?*', times: 1}, product_offering).as('productOffering')
    cy.intercept( {method: 'GET', url: 'http://proxy.docker:8004/config', times: 1}, init_config).as('config')
    cy.intercept( {method:'GET', url: 'http://proxy.docker:8004/catalog/category?*', times: 1}, category_launched).as('category')
    // Verify mocks are called 1 time
    cy.visit('/')
    cy.wait('@stats')
    cy.get('@stats.all').should('have.length', 1)
    cy.wait('@config')
    cy.get('@config.all').should('have.length', 1)
    cy.wait('@productOffering')
    cy.get('@productOffering.all').should('have.length', 1)
    cy.wait('@category')
    cy.get('@category.all').should('have.length', 1)
    // Verify header interactive elemements are displayed and work as expected
    cy.login().should('exist')
    cy.getBySel('publishOffering').should('exist')
    cy.getBySel('browse').should('exist')
    cy.getBySel('about').should('exist')
    cy.getBySel('registerAcc').should('exist')
    cy.getBySel('knowledge').should('exist')
    cy.getBySel('darkMode').should('exist')

    cy.getBySel('darkMode').click()
    cy.getBySel('moonSVG').should('have.class', 'hidden')
    cy.getBySel('sunSVG').should('not.have.class', 'hidden')
    cy.getBySel('darkMode').click()
    cy.getBySel('sunSVG').should('have.class', 'hidden')
    cy.getBySel('moonSVG').should('not.have.class', 'hidden')

    cy.getBySel('knowledge').should('have.attr', 'href', init_config.knowledgeBaseUrl)
};

describe('/dashboard',{
    viewportHeight: 800,
    viewportWidth: 1080,
  },
  () => {

    it('should login successfully and show the required components in pre-login and post-login', () => {
        checkHeaderPreLogin()
        local_items.expire = moment().unix() + 100
        window.localStorage.setItem('local_items', JSON.stringify(local_items))
        cy.visit('/dashboard')
        cy.reload()
        
    })
    })

