import { catalog_launched, category_dft, local_items, loginAcc, productOffering, productSpec } from "../support/constants"

class PriceComponent {
    public name: string;
    public description: string;
    public price: number;
    public type: 'one time' | 'recurring' | 'recurring-prepaid' | 'usage';
    public recurringType?: 'day' | 'week' | 'month' | 'year';
    public usageInput?: [string, string];

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
            role: 'Seller',
            '@referredType': ''
        }]}

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, undefined)

        // Starting the form filling
        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').its('length').should('be.gte', 1)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').its('length').should('be.gte', 1)

        cy.getBySel('newOffering').click()

        fillGeneralInfo(productOffering, productSpec, newCatalog)
        fillCategory(category_dft)
        fillTermsAndConditions('description test')
        selectFreePricing()
        fillProcurementAndSubmit()

        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        assertCreatedOfferRow(productOffering.name)

    })
    it('should create a offering with recurring price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Seller',
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

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {usage:[]})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').its('length').should('be.gte', 1)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').its('length').should('be.gte', 1)

        cy.getBySel('newOffering').click()

        fillGeneralInfo(productOffering, productSpec, newCatalog)
        fillCategory(category_dft)
        fillTermsAndConditions('description test')
        addOnlinePaidPricePlan(pricePlan, priceComponent)
        fillProcurementAndSubmit()


        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', priceComponent.name).and.be.a('string')
            expect(payload).to.have.property('description', priceComponent.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }
        });
        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload).to.have.property('bundledPopRelationship')

        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        assertCreatedOfferRow(productOffering.name)

    })
    it('should create a offering with per usage price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Seller',
            '@referredType': ''
        }]}

        const usageSpecs = [
            {
                "id": "urn:ngsi-ld:usageSpecification:mock",
                "href": "urn:ngsi-ld:usageSpecification:mock",
                "description": "u1",
                "name": "u1",
                "relatedParty": [
                    {
                        "id": "mock:organization",
                        "href": "mock:organization",
                        "role": "Seller",
                        "@referredType": null
                    }
                ],
                "specCharacteristic": [
                    {
                        "description": "m1",
                        "name": "m1",
                        "valueType": "number"
                    },
                    {
                        "description": "m2",
                        "name": "m2",
                        "valueType": "number"
                    }
                ]
            }
        ]

        const pricePlan = {
            name: 'test price plan',
            description: 'description price plan test'
        }
        const priceComponent  : PriceComponent = {
            name: 'test price component',
            description: 'description price component',
            type: 'usage',
            price: 5.12,
            usageInput: ['u1', 'm1']
        }

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {usage:usageSpecs})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').its('length').should('be.gte', 1)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').its('length').should('be.gte', 1)

        cy.getBySel('newOffering').click()

        fillGeneralInfo(productOffering, productSpec, newCatalog)
        fillCategory(category_dft)
        fillTermsAndConditions('description test')
        addOnlinePaidPricePlan(pricePlan, priceComponent)
        fillProcurementAndSubmit()

        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', priceComponent.name).and.be.a('string')
            expect(payload).to.have.property('description', priceComponent.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }

        });
        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload).to.have.property('bundledPopRelationship')

        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        assertCreatedOfferRow(productOffering.name)

    })
    it('should create a offering with recurring-prepaid price plan correctly', () => {

        const newCatalog = { id: 'catalogId', href: 'catalogId',name: 'catalogTest', description: '', lifecycleStatus: 'Launched', relatedParty: [{
            id: local_items.partyId,
            role: 'Seller',
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

        interceptors(productSpec, productOffering, newCatalog, catalog_launched[0], category_dft, {usage: []})

        cy.visit('/my-offerings')
        cy.wait('@catalogs')
        cy.get('@catalogs.all').its('length').should('be.gte', 1)

        cy.getBySel('offerSection').click()
        cy.wait('@productOff')
        cy.get('@productOff.all').its('length').should('be.gte', 1)

        cy.getBySel('newOffering').click()

        fillGeneralInfo(productOffering, productSpec, newCatalog)
        fillCategory(category_dft)
        fillTermsAndConditions('description test')
        addOnlinePaidPricePlan(pricePlan, priceComponent)
        fillProcurementAndSubmit()

        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', priceComponent.name).and.be.a('string')
            expect(payload).to.have.property('description', priceComponent.description).and.be.a('string')
            expect(payload.price).to.have.property('value', priceComponent.price)
            if(priceComponent.recurringType){
                expect(payload).to.have.property('recurringChargePeriodType', priceComponent.recurringType)
            }

        });
        cy.wait('@offPricePOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', pricePlan.name).and.be.a('string')
            expect(payload).to.have.property('description', pricePlan.description).and.be.a('string')
            expect(payload).to.have.property('bundledPopRelationship')

        });
        cy.wait('@offPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('name', productOffering.name).and.be.a('string')
            expect(payload).to.have.property('description', productOffering.description).and.be.a('string')
            expect(payload).to.have.property('lifecycleStatus', productOffering.lifecycleStatus).and.be.a('string')
        });
        assertCreatedOfferRow(productOffering.name)

    })
  })



const interceptors = (productSpec:any, productOfferingPOST:any, newCatalog:any, defaultCatalog: any, defaultCategory:any, offPricePOST:any) => {
    let offeringCreated = false
    let priceCreateCalls = 0

    cy.intercept({method: 'GET', url: '**/catalog/catalog?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: [newCatalog]
        })
    }).as('catalogs')
    cy.intercept({method: 'GET', url: '**/catalog/productOffering?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: offeringCreated ? [productOfferingPOST] : []
        })
    }).as('productOff')
    cy.intercept({method: 'GET', url: '**/catalog/productSpecification?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: [productSpec]
        })
    }).as('productSpec')
    cy.intercept({method: 'GET', url: '**/catalog/productSpecification/urn:ngsi-ld:product-specification:*'}, {
        statusCode: 200,
        body: productSpec
    }).as('productSpecDetail')


    cy.intercept({method: 'GET', url: '**/catalog/catalog/urn:ngsi-ld:catalog:32828e1d-4652-4f4c-b13e-327450ce83c6'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: defaultCatalog
        })
    }).as('defaultCatalog')

    cy.intercept({method: 'GET', url: '**/catalog/category/urn:ngsi-ld:category:26435cca-2707-4c89-8f0c-79464573c9e2'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: defaultCategory
        })
    }).as('defaultCategory')
    cy.intercept({method: 'GET', url: '**/catalog/category?*'}, (res)=>{
        res.reply({
            statusCode: 200,
            body: res.url.includes('parentId=') ? [] : [defaultCategory]
        })
    }).as('categories')


    cy.intercept({method: 'POST', url: `**/catalog/catalog/${newCatalog.id}/productOffering`}, (req)=>{
        offeringCreated = true
        req.reply({statusCode: 201, body: productOfferingPOST})
    }).as('offPOST')
    if (offPricePOST){
        cy.intercept({method: 'GET', url: '**/usage/usageSpecification?*'}, (res)=>{
            res.reply({
                statusCode: 200,
                body: offPricePOST.usage
            })
        }).as('usageGET')
        cy.intercept({method: 'POST', url: '**/catalog/productOfferingPrice'}, (req) => {
            const id = `urn:ngsi-ld:product-offering-price:${priceCreateCalls++}`
            req.reply({
                statusCode: 201,
                body: {
                    ...req.body,
                    id,
                    href: id
                }
            })
        }).as('offPricePOST')

    }

}

const fillGeneralInfo = (productOffering: any, productSpec: any, catalog: any) => {
    cy.wait('@productSpec')
    cy.wait('@catalogs')
    cy.getBySel('offerName').type(productOffering.name)
    cy.get('#prodSpecSelect').select(productSpec.id)
    cy.wait('@productSpecDetail')
    cy.getBySel('offerCatalogSelect').select(catalog.id)
    cy.getBySel('offerOverview').type(productOffering.description)
    cy.getBySel('offerNext').click()
}

const assertCreatedOfferRow = (name: string) => {
    cy.getBySel('offerRow').should('have.length', 1)
    cy.getBySel('offerTitle').should('contain.text', name)
    cy.getBySel('offerStatus').should('contain.text', 'Not completed')
    cy.getBySel('offerActions').find('button').should('have.length.at.least', 1)
}

const fillCategory = (category: any) => {
    cy.get('#rootCategorySelect').find('option').should('contain.text', category.name)
    cy.get('#rootCategorySelect').select(category.id)
    cy.getBySel('offerNext').click()
}

const fillTermsAndConditions = (description: string) => {
    cy.getBySel('tcText').find('[data-cy="textArea"]').type(description)
    cy.getBySel('offerNext').click()
}

const selectFreePricing = () => {
    cy.contains('button.plan-card', 'Free').click()
    cy.getBySel('offerNext').click()
}

const addOnlinePaidPricePlan = (pricePlan:any, priceComponent:PriceComponent) => {
    cy.contains('button.plan-card', 'Online paid price').click()
    cy.getBySel('addPricePlan').first().click()
    cy.contains('button.plan-card', 'Flex plan').click()
    cy.getBySel('selectPlanTypeContinue').click()

    cy.getBySel('paidName').type(pricePlan.name)
    cy.getBySel('paidDescription').find('[data-cy="textArea"]').type(pricePlan.description)
    cy.getBySel('addPriceComponent').click()
    cy.getBySel('pcName').type(priceComponent.name)
    cy.getBySel('pcDescription').type(priceComponent.description)
    cy.getBySel('pcBasePrice').type(String(priceComponent.price))
    cy.getBySel('pcPriceType').click()
    cy.get(`[data-cy="pcPriceType-${priceComponent.type}"]`).click()
    if (priceComponent.recurringType){
        cy.get(`[data-cy="pcRecurringPeriod-${priceComponent.recurringType}"]`).check()
    }
    else if (priceComponent.usageInput){
        cy.wait('@usageGET')
        cy.getBySel('pcUsageSpec').select(priceComponent.usageInput[0])
        cy.getBySel('pcMetric').select(priceComponent.usageInput[1])
    }
    cy.getBySel('pcSave').click()
    cy.getBySel('ppSave').should('not.be.disabled').click()
    cy.getBySel('offerNext').click()
}

const fillProcurementAndSubmit = () => {
    cy.getBySel('offerFinish').click()
}
