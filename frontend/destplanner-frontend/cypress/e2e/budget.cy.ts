// cypress/e2e/budget.cy.ts
// Sprint 2 — Cypress E2E test: Budget Tracker feature
// Frontend owner: Rishitha Pydipati

describe('Budget Tracker', () => {
  beforeEach(() => {
    // Visit the budget page before each test
    cy.visit('/budget');
  });

  // Page loads correctly 
  it('should display the Budget Tracker page with header', () => {
    cy.contains('Trip Budget Tracker').should('be.visible');
    cy.contains('Set Budget').should('be.visible');
    cy.contains('Add Expense').should('be.visible');
  });

  //  Set Budget form opens 
  it('should open the Set Budget form when clicking Set Budget button', () => {
    cy.get('[data-cy=set-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');
    cy.get('[data-cy=budget-input]').should('exist');
  });

  // Set Budget — fill and submit 
  it('should allow user to fill in and submit a budget', () => {
    cy.get('[data-cy=set-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');

    // Type the budget amount
    cy.get('[data-cy=budget-input]').clear().type('2000');

    // Submit the form
    cy.get('[data-cy=save-budget-btn]').click();

    // Form should close (either success or local fallback)
    cy.get('[data-cy=budget-form]').should('not.exist');
  });

  // Add Expense form opens 
  it('should open the Add Expense form when clicking Add Expense button', () => {
    cy.get('[data-cy=add-expense-btn]').click();
    cy.get('[data-cy=expense-form]').should('be.visible');
    cy.get('[data-cy=expense-amount]').should('exist');
    cy.get('[data-cy=expense-category]').should('exist');
  });

  //  Add Expense — fill and submit 
  it('should allow user to fill in and submit an expense', () => {
    // First set a budget so the page is in a valid state
    cy.get('[data-cy=set-budget-btn]').click();
    cy.get('[data-cy=budget-input]').clear().type('1500');
    cy.get('[data-cy=save-budget-btn]').click();

    // Now add an expense
    cy.get('[data-cy=add-expense-btn]').click();
    cy.get('[data-cy=expense-form]').should('be.visible');

    cy.get('[data-cy=expense-amount]').clear().type('75');

    // Select a category from the mat-select
    cy.get('[data-cy=expense-category]').click();
    cy.get('mat-option').contains('Food & Dining').click();

    cy.get('[data-cy=expense-description]').type('Lunch at the beach');
    cy.get('[data-cy=expense-date]').clear().type('2025-06-15');

    cy.get('[data-cy=save-expense-btn]').click();

    // Form should close after submit
    cy.get('[data-cy=expense-form]').should('not.exist');
  });

  //  Forms close on cancel
  it('should close the budget form when Cancel is clicked', () => {
    cy.get('[data-cy=set-budget-btn]').click();
    cy.get('[data-cy=budget-form]').should('be.visible');
    cy.contains('Cancel').click();
    cy.get('[data-cy=budget-form]').should('not.exist');
  });

  it('should close the expense form when Cancel is clicked', () => {
    cy.get('[data-cy=add-expense-btn]').click();
    cy.get('[data-cy=expense-form]').should('be.visible');
    cy.contains('Cancel').click();
    cy.get('[data-cy=expense-form]').should('not.exist');
  });
});