// cypress/e2e/budget.cy.ts
// Sprint 2 — Cypress E2E test: Budget Tracker feature
// Frontend owner: Rishitha Pydipati
/// <reference types="cypress" />

describe('Budget Tracker', () => {

  beforeEach(() => {

    cy.request({
      method: 'POST',
      url: 'http://localhost:8080/api/auth/login',
      body: {
        email: 'rishitha@gmail.com',   
        password: 'Rishitha@2607'
      }
    }).then((res) => {

      expect(res.status).toEqual(200);

      
      const cookies = res.headers['set-cookie'];

      if (cookies) {
        cookies.forEach((cookie: string) => {
          const parts = cookie.split(';')[0].split('=');
          const name = parts[0];
          const value = parts[1];

          cy.setCookie(name, value);
        });
      }
    });

    cy.visit('/budget');
  });

  //  Page loads correctly 
  it('should display the Budget Tracker page with header', () => {
    cy.contains('Budget Tracker', { timeout: 10000 }).should('be.visible');
    cy.contains('New Budget').should('be.visible');
  });

  // Create Budget form opens 
  it('should open the Create Budget form when clicking New Budget button', () => {
    cy.get('[data-cy=create-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');
    cy.get('[data-cy=trip-name-input]').should('exist');
    cy.get('[data-cy=budget-input]').should('exist');
  });

  // Create Budget — fill and submit 
  it('should allow user to fill in trip name and budget amount and submit', () => {
    cy.get('[data-cy=create-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');

    cy.get('[data-cy=trip-name-input]').type('Test Trip');
    cy.get('[data-cy=budget-input]').clear().type('2000');

    cy.get('[data-cy=save-budget-btn]').click();

    cy.get('[data-cy=budget-form]').should('not.exist');
  });

  //  Form closes on cancel
  it('should close the budget form when Cancel is clicked', () => {
    cy.get('[data-cy=create-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');

    cy.contains('Cancel').click();

    cy.get('[data-cy=budget-form]').should('not.exist');
  });

  //  Add Expense inside a budget 
  it('should open Add Expense form when inside a budget', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.budget-card').length) {
        cy.get('.budget-card').first().click();
        cy.get('[data-cy=add-expense-btn]').click();
        cy.get('[data-cy=expense-form]').should('be.visible');
        cy.get('[data-cy=expense-amount]').should('exist');
        cy.get('[data-cy=expense-category]').should('exist');
      }
    });
  });

  // Add Expense — fill and submit
  it('should allow user to fill in and submit an expense', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.budget-card').length) {
        cy.get('.budget-card').first().click();
        cy.get('[data-cy=add-expense-btn]').click();
        cy.get('[data-cy=expense-form]').should('be.visible');

        cy.get('[data-cy=expense-amount]').clear().type('75');
        cy.get('[data-cy=expense-category]').click();
        cy.get('mat-option').contains('Food & Dining').click();
        cy.get('[data-cy=expense-description]').type('Lunch at the beach');
        cy.get('[data-cy=expense-date]').clear().type('2025-06-15');

        cy.get('[data-cy=save-expense-btn]').click();
        cy.get('[data-cy=expense-form]').should('not.exist');
      }
    });
  });

});