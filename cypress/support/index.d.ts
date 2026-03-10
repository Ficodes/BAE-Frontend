// cypress/support/index.d.ts

declare namespace Cypress {
    interface Chainable<Subject = any> {
      login(): Chainable<Subject>;
      getBySel(selector: string): Chainable<JQuery<HTMLElement>>;
    }
  }
  