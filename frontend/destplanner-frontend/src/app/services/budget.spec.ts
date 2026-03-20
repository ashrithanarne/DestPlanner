import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { BudgetService, BudgetSummary, Expense } from './budget';

const MOCK_SUMMARY: BudgetSummary = {
  trip_id: 'trip-1',
  total_budget: 1000,
  total_expenses: 400,
  remaining_budget: 600,
  currency: 'USD',
  expenses: [
    { id: 1, trip_id: 'trip-1', amount: 200, category: 'Accommodation', description: 'Hotel', date: '2025-01-01' },
    { id: 2, trip_id: 'trip-1', amount: 150, category: 'Food & Dining', description: 'Dinner', date: '2025-01-02' },
    { id: 3, trip_id: 'trip-1', amount: 50,  category: 'Accommodation', description: 'Hostel', date: '2025-01-03' },
  ],
};

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

  afterEach(() => {
    httpMock.verify();
  });

  // ── should be created ───────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── setBudget ───────────────────────────────────────────────────────────
  it('setBudget: should POST to /expenses/budget and update summary$', () => {
    let emitted: BudgetSummary | null = null;
    service.summary$.subscribe((s) => (emitted = s));

    service.setBudget({ trip_id: 'trip-1', total_budget: 1000, currency: 'USD' }).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/expenses/budget'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ trip_id: 'trip-1', total_budget: 1000, currency: 'USD' });
    req.flush(MOCK_SUMMARY);

    expect(emitted).toEqual(MOCK_SUMMARY);
  });

  // ── addExpense ──────────────────────────────────────────────────────────
  it('addExpense: should POST to /expenses and then trigger a GET for the summary', () => {
    const newExpense: Omit<Expense, 'id'> = {
      trip_id: 'trip-1',
      amount: 80,
      category: 'Transport',
      description: 'Taxi',
      date: '2025-01-04',
    };

    service.addExpense(newExpense).subscribe();

    // First: POST /expenses
    const postReq = httpMock.expectOne((r) => r.url.includes('/expenses') && r.method === 'POST');
    expect(postReq.request.body).toEqual(expect.objectContaining(newExpense));
    postReq.flush({ id: 10, ...newExpense });

    // Second: automatic GET /budget/trip-1 triggered after add
    const getReq = httpMock.expectOne((r) => r.url.includes('/budget/trip-1'));
    expect(getReq.request.method).toBe('GET');
    getReq.flush(MOCK_SUMMARY);
  });

  // ── getExpenses ─────────────────────────────────────────────────────────
  it('getExpenses: should GET /expenses with tripId query param', () => {
    let result: Expense[] = [];
    service.getExpenses('trip-1').subscribe((expenses) => { result = expenses; });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/expenses') && r.params.get('tripId') === 'trip-1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_SUMMARY.expenses);

    expect(result.length).toBe(3);
  });

  // ── getBudgetSummary ────────────────────────────────────────────────────
  it('getBudgetSummary: should GET /budget/:tripId and update summary$', () => {
    let emitted: BudgetSummary | null = null;
    service.summary$.subscribe((s) => (emitted = s));

    service.getBudgetSummary('trip-1').subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/budget/trip-1'));
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_SUMMARY);

    expect(emitted).toEqual(MOCK_SUMMARY);
  });

  // ── deleteExpense ───────────────────────────────────────────────────────
  it('deleteExpense: should DELETE /expenses/:id and refresh summary', () => {
    service.deleteExpense(1, 'trip-1').subscribe();

    const delReq = httpMock.expectOne((r) => r.url.includes('/expenses/1'));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);

    // Should follow up with GET /budget/trip-1
    const getReq = httpMock.expectOne((r) => r.url.includes('/budget/trip-1'));
    expect(getReq.request.method).toBe('GET');
    getReq.flush(MOCK_SUMMARY);
  });

  // ── getCategoryTotals ───────────────────────────────────────────────────
  it('getCategoryTotals: should sum amounts per category and sort descending', () => {
    const totals = service.getCategoryTotals(MOCK_SUMMARY.expenses);
    // Accommodation: 200 + 50 = 250, Food & Dining: 150
    expect(totals[0]).toEqual({ category: 'Accommodation', total: 250 });
    expect(totals[1]).toEqual({ category: 'Food & Dining', total: 150 });
  });

  // ── getCategoryTotals — empty list ──────────────────────────────────────
  it('getCategoryTotals: should return empty array for no expenses', () => {
    expect(service.getCategoryTotals([])).toEqual([]);
  });

  // ── getSpentPercentage ──────────────────────────────────────────────────
  it('getSpentPercentage: should return correct percentage', () => {
    expect(service.getSpentPercentage(MOCK_SUMMARY)).toBe(40); // 400/1000
  });

  // ── getSpentPercentage — over budget ────────────────────────────────────
  it('getSpentPercentage: should cap at 100 when overspent', () => {
    const over: BudgetSummary = { ...MOCK_SUMMARY, total_expenses: 2000 };
    expect(service.getSpentPercentage(over)).toBe(100);
  });

  // ── getSpentPercentage — zero budget ────────────────────────────────────
  it('getSpentPercentage: should return 0 when total_budget is 0', () => {
    const zeroBudget: BudgetSummary = { ...MOCK_SUMMARY, total_budget: 0 };
    expect(service.getSpentPercentage(zeroBudget)).toBe(0);
  });

  // ── updateLocalSummary ──────────────────────────────────────────────────
  it('updateLocalSummary: should push value directly to summary$', () => {
    let emitted: BudgetSummary | null = null;
    service.summary$.subscribe((s) => (emitted = s));

    service.updateLocalSummary(MOCK_SUMMARY);
    expect(emitted).toEqual(MOCK_SUMMARY);
  });
});