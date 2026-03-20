import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { BudgetComponent } from './budget';
import { BudgetService, BudgetSummary } from '../../services/budget';

const MOCK_SUMMARY: BudgetSummary = {
  trip_id: 'default-trip',
  total_budget: 1500,
  total_expenses: 600,
  remaining_budget: 900,
  currency: 'USD',
  expenses: [
    { id: 1, trip_id: 'default-trip', amount: 400, category: 'Accommodation', description: 'Hotel', date: '2025-06-01' },
    { id: 2, trip_id: 'default-trip', amount: 200, category: 'Food & Dining', description: 'Meals', date: '2025-06-02' },
  ],
};

describe('BudgetComponent', () => {
  let component: BudgetComponent;
  let fixture: ComponentFixture<BudgetComponent>;
  let summarySubject: BehaviorSubject<BudgetSummary | null>;

  const mockBudgetService = {
    summary$: of(MOCK_SUMMARY) as any,
    getBudgetSummary: vi.fn(() => of(MOCK_SUMMARY)),
    setBudget: vi.fn(() => of(MOCK_SUMMARY)),
    addExpense: vi.fn(() => of({ id: 99, trip_id: 'default-trip', amount: 50, category: 'Transport', description: 'Taxi', date: '2025-06-03' })),
    getExpenses: vi.fn(() => of(MOCK_SUMMARY.expenses)),
    deleteExpense: vi.fn(() => of(undefined)),
    getCategoryTotals: vi.fn(() => [
      { category: 'Accommodation', total: 400 },
      { category: 'Food & Dining', total: 200 },
    ]),
    getSpentPercentage: vi.fn(() => 40),
    updateLocalSummary: vi.fn(),
  };

  beforeEach(async () => {
    summarySubject = new BehaviorSubject<BudgetSummary | null>(MOCK_SUMMARY);
    mockBudgetService.summary$ = summarySubject.asObservable();

    // Reset all mocks between tests
    vi.clearAllMocks();
    mockBudgetService.getBudgetSummary.mockReturnValue(of(MOCK_SUMMARY));
    mockBudgetService.getCategoryTotals.mockReturnValue([
      { category: 'Accommodation', total: 400 },
      { category: 'Food & Dining', total: 200 },
    ]);
    mockBudgetService.getSpentPercentage.mockReturnValue(40);

    await TestBed.configureTestingModule({
      imports: [BudgetComponent],
      providers: [
        { provide: BudgetService, useValue: mockBudgetService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ─────────────────────────────────────────────────────────────
  it('ngOnInit: should load budget summary on init', () => {
    expect(mockBudgetService.getBudgetSummary).toHaveBeenCalledWith('default-trip');
    expect(component.summary).toEqual(MOCK_SUMMARY);
  });

  // ── toggleBudgetForm ─────────────────────────────────────────────────────
  it('toggleBudgetForm: should toggle showBudgetForm and close expense form', () => {
    component.showExpenseForm = true;
    component.toggleBudgetForm();
    expect(component.showBudgetForm).toBe(true);
    expect(component.showExpenseForm).toBe(false);

    component.toggleBudgetForm();
    expect(component.showBudgetForm).toBe(false);
  });

  // ── toggleExpenseForm ────────────────────────────────────────────────────
  it('toggleExpenseForm: should toggle showExpenseForm and close budget form', () => {
    component.showBudgetForm = true;
    component.toggleExpenseForm();
    expect(component.showExpenseForm).toBe(true);
    expect(component.showBudgetForm).toBe(false);

    component.toggleExpenseForm();
    expect(component.showExpenseForm).toBe(false);
  });

  // ── submitBudget — invalid form ──────────────────────────────────────────
  it('submitBudget: should not call service if form is invalid', () => {
    component.budgetForm.reset();
    component.submitBudget();
    expect(mockBudgetService.setBudget).not.toHaveBeenCalled();
  });

  // ── submitBudget — valid form ────────────────────────────────────────────
  it('submitBudget: should call setBudget and close form on success', async () => {
    mockBudgetService.setBudget.mockReturnValue(of(MOCK_SUMMARY));
    component.budgetForm.setValue({ total_budget: 1500, currency: 'USD' });
    component.showBudgetForm = true;

    component.submitBudget();
    await fixture.whenStable();

    expect(mockBudgetService.setBudget).toHaveBeenCalledWith({
      trip_id: 'default-trip',
      total_budget: 1500,
      currency: 'USD',
    });
    expect(component.showBudgetForm).toBe(false);
    expect(component.loadingBudget).toBe(false);
  });

  // ── submitBudget — backend error falls back to local update ──────────────
  it('submitBudget: should call updateLocalSummary on backend error', async () => {
    mockBudgetService.setBudget.mockReturnValue(throwError(() => new Error('offline')));
    component.summary = MOCK_SUMMARY;
    component.budgetForm.setValue({ total_budget: 2000, currency: 'USD' });

    component.submitBudget();
    await fixture.whenStable();

    expect(mockBudgetService.updateLocalSummary).toHaveBeenCalled();
    expect(component.showBudgetForm).toBe(false);
  });

  // ── submitExpense — invalid form ─────────────────────────────────────────
  it('submitExpense: should not call service if form is invalid', () => {
    component.expenseForm.reset();
    component.submitExpense();
    expect(mockBudgetService.addExpense).not.toHaveBeenCalled();
  });

  // ── submitExpense — valid form ───────────────────────────────────────────
  it('submitExpense: should call addExpense and close form on success', async () => {
    component.expenseForm.setValue({
      amount: 50,
      category: 'Transport',
      description: 'Taxi',
      date: '2025-06-03',
    });
    component.showExpenseForm = true;

    component.submitExpense();
    await fixture.whenStable();

    expect(mockBudgetService.addExpense).toHaveBeenCalled();
    expect(component.showExpenseForm).toBe(false);
    expect(component.loadingExpense).toBe(false);
  });

  // ── deleteExpense ────────────────────────────────────────────────────────
  it('deleteExpense: should call deleteExpense on service', async () => {
    mockBudgetService.deleteExpense.mockReturnValue(of(undefined));
    component.deleteExpense(MOCK_SUMMARY.expenses[0]);
    await fixture.whenStable();
    expect(mockBudgetService.deleteExpense).toHaveBeenCalledWith(1, 'default-trip');
  });

  // ── deleteExpense — no id ────────────────────────────────────────────────
  it('deleteExpense: should do nothing if expense has no id', () => {
    const noId = { trip_id: 'default-trip', amount: 10, category: 'Other', description: '', date: '' };
    component.deleteExpense(noId);
    expect(mockBudgetService.deleteExpense).not.toHaveBeenCalled();
  });

  // ── getSpentPercentage ───────────────────────────────────────────────────
  it('getSpentPercentage: should delegate to budgetService', () => {
    component.summary = MOCK_SUMMARY;
    const result = component.getSpentPercentage();
    expect(mockBudgetService.getSpentPercentage).toHaveBeenCalledWith(MOCK_SUMMARY);
    expect(result).toBe(40);
  });

  // ── getProgressColor ─────────────────────────────────────────────────────
  it('getProgressColor: should return primary for < 70% spent', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(50);
    expect(component.getProgressColor()).toBe('primary');
  });

  it('getProgressColor: should return accent for 70–89% spent', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(75);
    expect(component.getProgressColor()).toBe('accent');
  });

  it('getProgressColor: should return warn for >= 90% spent', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(95);
    expect(component.getProgressColor()).toBe('warn');
  });

  // ── formatCurrency ───────────────────────────────────────────────────────
  it('formatCurrency: should format number as USD by default', () => {
    component.summary = MOCK_SUMMARY;
    const formatted = component.formatCurrency(1234.5);
    expect(formatted).toContain('1,234.50');
  });

  // ── getCategoryIcon ──────────────────────────────────────────────────────
  it('getCategoryIcon: should return correct icon for known category', () => {
    expect(component.getCategoryIcon('Accommodation')).toBe('hotel');
    expect(component.getCategoryIcon('Food & Dining')).toBe('restaurant');
    expect(component.getCategoryIcon('Transport')).toBe('directions_car');
  });

  it('getCategoryIcon: should return fallback for unknown category', () => {
    expect(component.getCategoryIcon('Unknown')).toBe('receipt');
  });

  // ── getCategoryColor ─────────────────────────────────────────────────────
  it('getCategoryColor: should return correct color for known category', () => {
    expect(component.getCategoryColor('Accommodation')).toBe('#667eea');
    expect(component.getCategoryColor('Food & Dining')).toBe('#f6a623');
  });

  it('getCategoryColor: should return fallback for unknown category', () => {
    expect(component.getCategoryColor('XYZ')).toBe('#64748b');
  });

  // ── trackByExpenseId ─────────────────────────────────────────────────────
  it('trackByExpenseId: should return expense id when available', () => {
    expect(component.trackByExpenseId(0, MOCK_SUMMARY.expenses[0])).toBe(1);
  });

  it('trackByExpenseId: should return description when id is undefined', () => {
    const expense = { trip_id: 'x', amount: 10, category: 'Other', description: 'snack', date: '' };
    expect(component.trackByExpenseId(0, expense)).toBe('snack');
  });
});