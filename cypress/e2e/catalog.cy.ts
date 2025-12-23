import { category_launched, init_config, init_stat, local_items, login_token, loginAcc, product_offering } from "../support/constants"

describe('/my-offerings',{
    viewportHeight: 800,
    viewportWidth: 1080,
  },
  () => {

    beforeEach(()=>{
        loginAcc()
    })

    it('should create a catalog correctly', () => {
        const name = 'catalog name test'
        const description = 'catalog description test'
        const status = 'Active'
        const newCatalog = { id: 'test', href: 'test',name: name, description: description, lifecycleStatus: status, relatedParty: {
            id: local_items.partyId,
            role: 'Seller',
            '@referredType': ''
        }}
        let calls = 0
        const response = [[], [], [newCatalog] , []]
        cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/catalog?*'}, (res) => {
            res.reply({
                statusCode: 200,
                body: response[calls++]
              });
        }).as('catalog')
        cy.intercept({method: 'POST', url: 'http://proxy.docker:8004/catalog/catalog'}, {statusCode: 201, body: newCatalog}).as('catalogPOST')

        cy.visit('/my-offerings')
        cy.wait('@catalog')
        cy.get('@catalog.all').should('have.length', 4)
        cy.getBySel('newCatalog').click()
        cy.getBySel('catalogName').type(name)
        cy.getBySel('catalogDsc').type(description)
        cy.getBySel('catalogNext').click()
        cy.getBySel('catalogFinish').click()
        cy.wait('@catalogPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', name).and.be.a('string')
            expect(payload).to.have.property('description', description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', status).and.be.a('string')
        });
    })

    it('should create a catalog correctly with 100 characters in name even when you set more than 100 characters', () => {
        const check = 'c'.repeat(100)
        const name = check + 'aaa'
        const description = 'catalog description test'
        const status = 'Active'
        const newCatalog = { id: 'test', href: 'test',name: name, description: description, lifecycleStatus: status, relatedParty: {
            id: local_items.partyId,
            role: 'Seller',
            '@referredType': ''
        }}
        const getCatalog = { id: 'test', href: 'test',name: check, description: description, lifecycleStatus: status, relatedParty: {
            id: local_items.partyId,
            role: 'Seller',
            '@referredType': ''
        }}
        let calls = 0
        const response = [[], [], [getCatalog] , []]
        cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/catalog?*'}, (res) => {
            res.reply({
                statusCode: 200,
                body: response[calls++]
              });
        }).as('catalog')
        cy.intercept({method: 'POST', url: 'http://proxy.docker:8004/catalog/catalog'}, {statusCode: 201, body: newCatalog}).as('catalogPOST')

        cy.visit('/my-offerings')
        cy.wait('@catalog')
        cy.get('@catalog.all').should('have.length', 4)
        cy.getBySel('newCatalog').click()
        cy.getBySel('catalogName').type(name)
        cy.getBySel('catalogDsc').type(description)
        cy.getBySel('catalogNext').click()
        cy.getBySel('catalogFinish').click()
        cy.wait('@catalogPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', check).and.be.a('string')
            expect(payload).to.have.property('description', description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', status).and.be.a('string')
        });
    })
  })