import { local_items, loginAcc } from "../support/constants"

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
        mockCatalogRequests(newCatalog)
        visitCatalogs()
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
        cy.getBySel('catalogRow').should('have.length', 1)
        cy.getBySel('catalogRow').find('[data-cy="catalogName"]').invoke('text').should((text) => {
            expect(text.trim()).to.eq(name)
        })
    })

    it('should create a catalog correctly with 100 characters in name even when you set more than 100 characters', () => {
        const check = 'c'.repeat(100)
        const name = check + 'aaa'
        const description = 'catalog description test'
        const status = 'Active'
        const getCatalog = { id: 'test', href: 'test',name: check, description: description, lifecycleStatus: status, relatedParty: {
            id: local_items.partyId,
            role: 'Seller',
            '@referredType': ''
        }}
        mockCatalogRequests(getCatalog)
        visitCatalogs()
        cy.getBySel('newCatalog').click()
        cy.getBySel('catalogName').type(name)
        cy.getBySel('catalogName').should('have.value', check)
        cy.getBySel('catalogDsc').type(description)
        cy.getBySel('catalogNext').click()
        cy.getBySel('catalogFinish').click()
        cy.wait('@catalogPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', check).and.be.a('string')
            expect(payload).to.have.property('description', description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', status).and.be.a('string')
        });
        cy.getBySel('catalogRow').should('have.length', 1)
        cy.getBySel('catalogRow').find('[data-cy="catalogName"]').invoke('text').should((text) => {
            expect(text.trim()).to.eq(check)
        })
    })
  })

const mockCatalogRequests = (catalog: any) => {
    let created = false
    cy.intercept({method: 'GET', pathname: '/catalog/catalog'}, (req) => {
        const offset = Number(new URL(req.url).searchParams.get('offset') || 0)
        req.reply({statusCode: 200, body: created && offset === 0 ? [catalog] : []})
    }).as('catalogList')
    cy.intercept({method: 'POST', pathname: '/catalog/catalog'}, (req) => {
        created = true
        req.reply({statusCode: 201, body: catalog})
    }).as('catalogPOST')
}

const visitCatalogs = () => {
    cy.visit('/my-offerings')
    cy.location('pathname').should('eq', '/my-offerings')
    cy.getBySel('catalogSection').should('be.visible').click()
    cy.wait('@catalogList').its('response.statusCode').should('eq', 200)
}
