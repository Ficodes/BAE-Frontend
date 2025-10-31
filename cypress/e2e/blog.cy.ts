import { loginAcc, blogEntry, local_items } from "../support/constants"
import * as moment from 'moment';

describe('/blog',{
    viewportHeight: 800,
    viewportWidth: 1080,
  },
  () => {

    beforeEach(()=>{
        loginAcc()
    })

    it('should create a blog entry correctly', () => {
        cy.intercept({method: 'POST', url: 'http://proxy.docker:8004/domeblog'}, {statusCode: 201, body: blogEntry}).as('blogPOST')
        cy.visit('/blog')
        cy.getBySel('newBlogEntry').click()
        cy.getBySel('blogEntryTitle').type('Entry title')
        cy.getBySel('textArea').type('Blog entry content')
        cy.getBySel('blogEntryCreate').click()
        cy.wait('@blogPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.have.property('title', blogEntry.title).and.be.a('string')
            expect(payload).to.have.property('content', blogEntry.content).and.be.a('string')
            expect(payload).to.have.property('partyId', blogEntry.partyId).and.be.a('string')
            expect(payload).to.have.property('author', blogEntry.author).and.be.a('string')
        });
    })

})

