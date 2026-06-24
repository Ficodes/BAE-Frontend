import { loginAcc, blogEntry, local_items } from "../support/constants"
import moment from 'moment';

describe('/blog',{
    viewportHeight: 800,
    viewportWidth: 1080,
  },
  () => {

    beforeEach(()=>{
        loginAcc()
    })

    it('should create a blog entry correctly', () => {
        cy.intercept({method: 'GET', url: '**/domeblog'}, {statusCode: 200, body: []}).as('blogGET')
        cy.intercept({method: 'POST', url: '**/domeblog'}, {statusCode: 201, body: blogEntry}).as('blogPOST')
        cy.visit('/blog')
        cy.wait('@blogGET')
        cy.getBySel('newBlogEntry').click()
        cy.wait('@blogGET')
        cy.getBySel('blogEntryTitle').type('Entry title')
        cy.getBySel('textArea').type('Blog entry content')
        cy.getBySel('blogEntryCreate').click()
        cy.wait('@blogPOST').then((interception) => {
            const payload = interception.request.body
            expect(payload).to.deep.equal(blogEntry)
        });
    })

})
