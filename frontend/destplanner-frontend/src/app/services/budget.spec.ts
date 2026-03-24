import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { BudgetService, BudgetSummary, Expense } from './budget';

const MOCK_BUDGET: BudgetSummary = {
  id: 1,
  user_id: 1,
  trip_name: 'Paris Trip',
  total_budget: 1000,
  spent_amount: 400,
  remaining_budget: 600,
  percentage_used: 40,
  currency: 'USD',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const MOCK_EXPENSES: Expense[] = [
  { id: 1, budget_id: 1, category: 'Accommodation', amount: 200, description: 'Hotel', expense_date: '2025-01-01', created_at: '2025-01-01' },
  { id: 2, budget_id: 1, category: 'Food & Dining', amount: 150, description: 'Dinner', expense_date: '2025-01-02', created_at: '2025-01-02' },
  { id: 3, budget_id: 1, category: 'Accommodation', amount: 50, description: 'Hostel', expense_date: '2025-01-03', created_at: '2025-01-03' },
];

describe('BudgetService', () => {
  let service: BudgetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BudgetService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BudgetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ───────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── createBudget ────────────────────────────────────────────────────────
  it('createBudget: should POST to /budgets', () => {
    service.createBudget({ trip_name: 'Paris Trip', total_budget: 1000, currency: 'USD' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets') && r.method === 'POST');
    expect(req.request.body).toEqual({ trip_name: 'Paris Trip', total_budget: 1000, currency: 'USD' });
    req.flush({ message: 'Budget created', budget_id: 1 });
  });

  // ── getBudgets ──────────────────────────────────────────────────────────
  it('getBudgets: should GET /budgets and update budgets$', () => {
    let emitted: BudgetSummary[] = [];
    service.budgets$.subscribe((b) => (emitted = b));

    service.getBudgets().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets') && r.method === 'GET');
    req.flush({ budgets: [MOCK_BUDGET] });

    expect(emitted.length).toBe(1);
    expect(emitted[0].trip_name).toBe('Paris Trip');
  });

  // ── getBudgetById ───────────────────────────────────────────────────────
  it('getBudgetById: should GET /budgets/:id and update selectedBudget$', () => {
    let emitted: BudgetSummary | null = null;
    service.selectedBudget$.subscribe((b) => (emitted = b));

    service.getBudgetById(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1'));
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_BUDGET);

    expect(emitted).toEqual(MOCK_BUDGET);
  });

  // ── updateBudget ────────────────────────────────────────────────────────
  it('updateBudget: should PUT to /budgets/:id', () => {
    service.updateBudget(1, { trip_name: 'Updated Trip' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1') && r.method === 'PUT');
    expect(req.request.body).toEqual({ trip_name: 'Updated Trip' });
    req.flush({ message: 'Budget updated' });
  });

  // ── deleteBudget ────────────────────────────────────────────────────────
  it('deleteBudget: should DELETE /budgets/:id', () => {
    service.deleteBudget(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Budget deleted' });
  });

  // ── addExpense ──────────────────────────────────────────────────────────
  it('addExpense: should POST to /budgets/:id/expenses', () => {
    service.addExpense(1, { category: 'Transport', amount: 80 }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1/expenses') && r.method === 'POST');
    expect(req.request.body).toEqual({ category: 'Transport', amount: 80 });
    req.flush({ message: 'Expense added', expense_id: 10 });
  });

  // ── getExpenses ─────────────────────────────────────────────────────────
  it('getExpenses: should GET /budgets/:id/expenses', () => {
    let result: Expense[] = [];
    service.getExpenses(1).subscribe((res) => { result = res.expenses; });
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1/expenses') && r.method === 'GET');
    req.flush({ expenses: MOCK_EXPENSES });
    expect(result.length).toBe(3);
  });

  // ── updateExpense ───────────────────────────────────────────────────────
  it('updateExpense: should PUT to /budgets/:id/expenses/:expenseId', () => {
    service.updateExpense(1, 2, { category: 'Food & Dining', amount: 100 }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1/expenses/2') && r.method === 'PUT');
    expect(req.request.body).toEqual({ category: 'Food & Dining', amount: 100 });
    req.flush({ message: 'Expense updated' });
  });

  // ── deleteExpense ───────────────────────────────────────────────────────
  it('deleteExpense: should DELETE /budgets/:id/expenses/:expenseId', () => {
    service.deleteExpense(1, 2).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/budgets/1/expenses/2') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Expense deleted' });
  });

  // ── getCategoryTotals ───────────────────────────────────────────────────
  it('getCategoryTotals: should sum amounts per category and sort descending', () => {
    const totals = service.getCategoryTotals(MOCK_EXPENSES);
    expect(totals[0]).toEqual({ category: 'Accommodation', total: 250 });
    expect(totals[1]).toEqual({ category: 'Food & Dining', total: 150 });
  });

  // ── getCategoryTotals — empty ───────────────────────────────────────────
  it('getCategoryTotals: should return empty array for no expenses', () => {
    expect(service.getCategoryTotals([])).toEqual([]);
  });

  // ── getSpentPercentage ──────────────────────────────────────────────────
  it('getSpentPercentage: should return correct percentage', () => {
    expect(service.getSpentPercentage(MOCK_BUDGET)).toBe(40);
  });

  // ── getSpentPercentage — over budget ────────────────────────────────────
  it('getSpentPercentage: should cap at 100 when overspent', () => {
    const over: BudgetSummary = { ...MOCK_BUDGET, spent_amount: 2000 };
    expect(service.getSpentPercentage(over)).toBe(100);
  });

  // ── getSpentPercentage — zero budget ────────────────────────────────────
  it('getSpentPercentage: should return 0 when total_budget is 0', () => {
    const zeroBudget: BudgetSummary = { ...MOCK_BUDGET, total_budget: 0 };
    expect(service.getSpentPercentage(zeroBudget)).toBe(0);
  });

  // ── setSelectedBudget ───────────────────────────────────────────────────
  it('setSelectedBudget: should update selectedBudget$', () => {
    let emitted: BudgetSummary | null = null;
    service.selectedBudget$.subscribe((b) => (emitted = b));
    service.setSelectedBudget(MOCK_BUDGET);
    expect(emitted).toEqual(MOCK_BUDGET);
  });
});