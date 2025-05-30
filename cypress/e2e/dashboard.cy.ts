import { category_launched, init_config, init_stat, local_items, login_token, product_offering, checkHeaderPostLogin, checkHeaderPreLogin, loginAcc } from "../support/constants"
import * as moment from 'moment';

describe('/dashboard',{
    viewportHeight: 800,
    viewportWidth: 1080,
  },
  () => {

    it('should login successfully and show the required components in pre-login and post-login', () => {
       loginAcc()
    })

    it('should have all required elements in dashboard', ()=>{
        checkHeaderPreLogin()
        cy.getBySel('browseServices').should('not.be.disabled')
        cy.getBySel('mainText').should('exist')
        cy.getBySel('publishOff').should('exist')
        cy.getBySel('publishOff').should('have.attr', 'href', init_config.domeRegister)
        cy.getBySel('vServices').should('exist')
        cy.getBySel('vServices').should('have.text', '1 verified services')
        cy.getBySel('rPublishers').should('exist')
        cy.getBySel('rPublishers').should('have.text', '1 registered providers')
        cy.getBySel('nameServices').should('have.length', init_stat.services.length)
        cy.getBySel('nameOrgs').should('have.length', init_stat.organizations.length)

    })

})

