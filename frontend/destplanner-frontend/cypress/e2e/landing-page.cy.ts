// cypress/e2e/budget.cy.ts
// Sprint 2 — Simple Cypress E2E test

describe('DestPlanner App', () => {

  // ── Landing page loads ───────────────────────────────────────────────────
  it('should load the landing page', () => {
    cy.visit('/');
    cy.contains('DestPlanner').should('be.visible');
  });

  // ── Login page loads ─────────────────────────────────────────────────────
  it('should navigate to login page', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });

  // ── Register page loads ──────────────────────────────────────────────────
  it('should navigate to register page', () => {
    cy.visit('/register');
    cy.get('input').should('exist');
  });

  // ── Login form — fill fields ─────────────────────────────────────────────
  it('should allow typing in login form fields', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('input[type="email"]').should('have.value', 'test@example.com');
  });

  // ── Nav shows Login when not authenticated ───────────────────────────────
  it('should show Login link in nav when not authenticated', () => {
    cy.visit('/');
    cy.contains('Login').should('be.visible');
  });

  // ── Budget tracking card visible on landing page ─────────────────────────
  it('should show Budget Tracking feature on landing page', () => {
    cy.visit('/');
    cy.contains('Budget Tracking').should('be.visible');
  });

});