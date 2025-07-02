import { catalog_launched, category_dft, local_items, loginAcc, productOffering, productSpec } from "../support/constants"

class PriceComponent {
    public name: string;
    public description: string;
    public price: number;
    public type: 'one time' | 'recurring' | 'recurring-prepaid' | 'usage';
    public recurringType?: 'day' | 'week' | 'month' | 'year';
    public usageInput?: string;

}

describe('/my-offerings',{
    viewportHeight: 1080,
    viewportWidth: 1920,
  },
  () => {

    beforeEach(()=>{
        loginAcc()
    })

    it('should create a offering correctly', () => {

        const newCatalog = { id: 'test', href: 'test',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Owner',
            '@referredType': ''
        }]}

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, undefined)

        // Starting the form filling
        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').should('have.length', 2)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').should('have.length', 2)

        cy.getBySel('newOffering').click()

        step1(productOffering)

        step2(0, length = 1)

        step3(0, length = 1)

        step4(0, length = 1)

        step5('treatment test', 'description test')

        step6()

        step7()

        step8()

        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        cy.getBySel('offers').should('have.length', 1)
        cy.getBySel('offers').find('td').eq(0).should('contain.text', productOffering.name)
        cy.getBySel('offers').find('td').eq(1).should('contain.text', productOffering.lifecycleStatus)
        cy.getBySel('offers').find('td').eq(2).should('contain.text', 'Bundle')
        cy.getBySel('offers').find('td').eq(3).should('include.text', 'Friday, 16/05/25, 11:28')
        cy.getBySel('offers').find('td').eq(4).find('button').should('have.length', 1)

    })
    it('should create a offering with recurring price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Owner',
            '@referredType': ''
        }]}

        const pricePlan = {
            name: 'test price plan',
            description: 'description price plan test'
        }
        const priceComponent  : PriceComponent = {
            name: 'test price component',
            description: 'description price component',
            type: 'recurring',
            price: 5.12,
            recurringType: 'week'
        }

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').should('have.length', 2)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').should('have.length', 2)

        cy.getBySel('newOffering').click()

        step1(productOffering)

        step2(0, length = 1)

        step3(0, length = 1)

        step4(0, length = 1)

        step5('treatment test', 'description test')

        step6(true, pricePlan, priceComponent)

        step7()

        step8()

        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }
        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        cy.getBySel('offers').should('have.length', 1)
        cy.getBySel('offers').find('td').eq(0).should('contain.text', productOffering.name)
        cy.getBySel('offers').find('td').eq(1).should('contain.text', productOffering.lifecycleStatus)
        cy.getBySel('offers').find('td').eq(2).should('contain.text', 'Bundle')
        cy.getBySel('offers').find('td').eq(3).should('include.text', 'Friday, 16/05/25, 11:28')
        cy.getBySel('offers').find('td').eq(4).find('button').should('have.length', 1)

    })
    it('should create a offering with per usage price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Owner',
            '@referredType': ''
        }]}

        const pricePlan = {
            name: 'test price plan',
            description: 'description price plan test'
        }
        const priceComponent  : PriceComponent = {
            name: 'test price component',
            description: 'description price component',
            type: 'usage',
            price: 5.12,
            usageInput: 'CPU'
        }

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').should('have.length', 2)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').should('have.length', 2)

        cy.getBySel('newOffering').click()

        step1(productOffering)

        step2(0, length = 1)
        
        step3(0, length = 1)

        step4(0, length = 1)

        step5('treatment test', 'description test')

        step6(true, pricePlan, priceComponent)

        step7()

        step8()

        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }

        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        cy.getBySel('offers').should('have.length', 1)
        cy.getBySel('offers').find('td').eq(0).should('contain.text', productOffering.name)
        cy.getBySel('offers').find('td').eq(1).should('contain.text', productOffering.lifecycleStatus)
        cy.getBySel('offers').find('td').eq(2).should('contain.text', 'Bundle')
        cy.getBySel('offers').find('td').eq(3).should('include.text', 'Friday, 16/05/25, 11:28')
        cy.getBySel('offers').find('td').eq(4).find('button').should('have.length', 1)

    })
    it('should create a offering with recurring-prepaid price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Owner',
            '@referredType': ''
        }]}

        const pricePlan = {
            name: 'test price plan',
            description: 'description price plan test'
        }
        const priceComponent  : PriceComponent = {
            name: 'test price component',
            description: 'description price component',
            type: 'recurring-prepaid',
            price: 5.12,
            recurringType: 'week'
        }

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').should('have.length', 2)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').should('have.length', 2)

        cy.getBySel('newOffering').click()

        step1(productOffering)

        step2(0, length = 1)

        step3(0, length = 1)

        step4(0, length = 1)

        step5('treatment test', 'description test')

        step6(true, pricePlan, priceComponent)

        step7()

        step8()

        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }

        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        cy.getBySel('offers').should('have.length', 1)
        cy.getBySel('offers').find('td').eq(0).should('contain.text', productOffering.name)
        cy.getBySel('offers').find('td').eq(1).should('contain.text', productOffering.lifecycleStatus)
        cy.getBySel('offers').find('td').eq(2).should('contain.text', 'Bundle')
        cy.getBySel('offers').find('td').eq(3).should('include.text', 'Friday, 16/05/25, 11:28')
        cy.getBySel('offers').find('td').eq(4).find('button').should('have.length', 1)

    })
  })



const interceptors = (productSpec:any, productOfferingPOST:any, newCatalog:any, defaultCatalog: any, defaultCategory:any, offPricePOST:any) => {
    const specResponse = [[productSpec], []]
    const response = [[],[], [productOfferingPOST], []]
    const sr = [[newCatalog],[],[newCatalog], []]
    let call = 0
    let specCall = 0
    let scall = 0

    cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/catalog?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: sr[scall++]
        })
    }).as('catalogs')
    cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/productOffering?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: response[call++]
        })
    }).as('productOff')
    cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/productSpecification?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: specResponse[specCall++]
        })
    }).as('productSpec')


    cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/catalog/urn:ngsi-ld:catalog:32828e1d-4652-4f4c-b13e-327450ce83c6'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: defaultCatalog
        })
    }).as('defaultCatalog')

    cy.intercept({method: 'GET', url: 'http://proxy.docker:8004/catalog/category/urn:ngsi-ld:category:26435cca-2707-4c89-8f0c-79464573c9e2'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: defaultCategory
        })
    }).as('defaultCategory')


    cy.intercept({method: 'POST', url: `http://proxy.docker:8004/catalog/catalog/${newCatalog.id}/productOffering`}, {statusCode: 201, body: productOfferingPOST}).as('offPOST')
    if (offPricePOST){
        cy.intercept({method: 'POST', url: 'http://proxy.docker:8004/catalog//productOfferingPrice'}, {statusCode: 201, body: offPricePOST}).as('offPricePOST')
    }

}

const step1 = (productOffering: any) => {

    cy.getBySel('offerName').type(productOffering.name)
    cy.getBySel('offerVersion').should('have.value', productOffering.version)
    cy.getBySel('textArea').type(productOffering.description)
    cy.getBySel('offerNext').click()
}

const step2 = (pos: number, length: number) => {
    cy.wait('@productSpec')
    cy.getBySel('prodSpecs').should('have.length', length)
    cy.getBySel('prodSpecs').eq(pos).click()
    cy.getBySel('offerNext').click()
}

const step3 = (pos: number, length: number) => {
    cy.wait('@catalogs')
    cy.getBySel('catalogList').should('have.length', length)
    cy.getBySel('catalogList').eq(pos).click()
    cy.getBySel('offerNext').click()
}

const step4 = (pos: number, length: number) => {
    cy.wait('@defaultCatalog')
    cy.wait('@defaultCategory')
    cy.getBySel('categoryList').should('have.length', length)
    cy.getBySel('categoryList').eq(pos).click()
    cy.getBySel('offerNext').click()
}

const step5 = (treatment: string, description: string) => {
    cy.getBySel('treatment').type(treatment)
    cy.getBySel('textArea').type(description)
    cy.getBySel('offerNext').click()
}

const step6 = (online: boolean=false, pricePlan:any = null, priceComponent:PriceComponent = null) => {
    if(online){
        cy.getBySel('onlinePayment').click()
    }
    if(pricePlan){
        cy.getBySel('newPricePlan').click()
        cy.getBySel('pricePlanName').type(pricePlan.name)
        cy.getBySel('textArea').type(pricePlan.description)
        cy.getBySel('savePricePlan').should('have.attr', 'disabled')
        if(priceComponent){
            cy.getBySel('newPriceComponent').click()
            cy.getBySel('priceComponentName').type(priceComponent.name)
            cy.getBySel('priceComponentDescription').find('[data-cy="textArea"]').type(priceComponent.description)
            cy.getBySel('price').type(String(priceComponent.price))
            cy.getBySel('priceType').select(priceComponent.type)
            if (priceComponent.recurringType){
                cy.getBySel('recurringType').select(priceComponent.recurringType)
            }
            else if (priceComponent.usageInput){
                cy.getBySel('usageInput').type(priceComponent.usageInput)
            }
            cy.getBySel('savePriceComponent').click()
        }
        cy.getBySel('savePricePlan').click()
    }
    cy.getBySel('offerNext').click()
}

const step7 = () => {
    cy.getBySel('offerNext').click()
}

const step8 = () => {
    cy.getBySel('offerFinish').click()
}