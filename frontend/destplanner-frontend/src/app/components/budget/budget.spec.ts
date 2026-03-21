import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { BudgetComponent } from './budget';
import { BudgetService, BudgetSummary, Expense } from '../../services/budget';

const MOCK_BUDGET: BudgetSummary = {
  id: 1,
  user_id: 1,
  trip_name: 'Paris Trip',
  total_budget: 1500,
  spent_amount: 600,
  remaining_budget: 900,
  percentage_used: 40,
  currency: 'USD',
  created_at: '2025-06-01',
  updated_at: '2025-06-01',
};

const MOCK_EXPENSES: Expense[] = [
  { id: 1, budget_id: 1, category: 'Accommodation', amount: 400, description: 'Hotel', expense_date: '2025-06-01', created_at: '2025-06-01' },
  { id: 2, budget_id: 1, category: 'Food & Dining', amount: 200, description: 'Meals', expense_date: '2025-06-02', created_at: '2025-06-02' },
];

describe('BudgetComponent', () => {
  let component: BudgetComponent;
  let fixture: ComponentFixture<BudgetComponent>;

  const mockBudgetService = {
    budgets$: new BehaviorSubject<BudgetSummary[]>([MOCK_BUDGET]).asObservable(),
    selectedBudget$: new BehaviorSubject<BudgetSummary | null>(null).asObservable(),
    expenses$: new BehaviorSubject<Expense[]>([]).asObservable(),
    getBudgets: vi.fn(() => of({ budgets: [MOCK_BUDGET] })),
    getBudgetById: vi.fn(() => of(MOCK_BUDGET)),
    createBudget: vi.fn(() => of({ message: 'Budget created', budget_id: 1 })),
    updateBudget: vi.fn(() => of({ message: 'Budget updated' })),
    deleteBudget: vi.fn(() => of({ message: 'Budget deleted' })),
    addExpense: vi.fn(() => of({ message: 'Expense added', expense_id: 99 })),
    getExpenses: vi.fn(() => of({ expenses: MOCK_EXPENSES })),
    updateExpense: vi.fn(() => of({ message: 'Expense updated' })),
    deleteExpense: vi.fn(() => of({ message: 'Expense deleted' })),
    getCategoryTotals: vi.fn(() => [{ category: 'Accommodation', total: 400 }]),
    getSpentPercentage: vi.fn(() => 40),
    setSelectedBudget: vi.fn(),
    updateLocalSummary: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBudgetService.getBudgets.mockReturnValue(of({ budgets: [MOCK_BUDGET] }));
    mockBudgetService.getCategoryTotals.mockReturnValue([{ category: 'Accommodation', total: 400 }]);
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
  it('ngOnInit: should load budgets on init', () => {
    expect(mockBudgetService.getBudgets).toHaveBeenCalled();
  });

  // ── toggleCreateForm ─────────────────────────────────────────────────────
  it('toggleCreateForm: should toggle showCreateForm', () => {
    component.toggleCreateForm();
    expect(component.showCreateForm).toBe(true);
    component.toggleCreateForm();
    expect(component.showCreateForm).toBe(false);
  });

  // ── toggleExpenseForm ────────────────────────────────────────────────────
  it('toggleExpenseForm: should toggle showExpenseForm', () => {
    component.toggleExpenseForm();
    expect(component.showExpenseForm).toBe(true);
    component.toggleExpenseForm();
    expect(component.showExpenseForm).toBe(false);
  });

  // ── selectBudget ─────────────────────────────────────────────────────────
  it('selectBudget: should set selectedBudget and load expenses', () => {
    component.selectBudget(MOCK_BUDGET);
    expect(component.selectedBudget).toEqual(MOCK_BUDGET);
    expect(mockBudgetService.getExpenses).toHaveBeenCalledWith(1);
  });

  // ── backToList ───────────────────────────────────────────────────────────
  it('backToList: should clear selectedBudget and expenses', () => {
    component.selectedBudget = MOCK_BUDGET;
    component.expenses = MOCK_EXPENSES;
    component.backToList();
    expect(component.selectedBudget).toBeNull();
    expect(component.expenses).toEqual([]);
  });

  // ── submitCreateBudget — invalid ─────────────────────────────────────────
  it('submitCreateBudget: should not call service if form is invalid', () => {
    component.createForm.reset();
    component.submitCreateBudget();
    expect(mockBudgetService.createBudget).not.toHaveBeenCalled();
  });

  // ── submitCreateBudget — valid ───────────────────────────────────────────
  it('submitCreateBudget: should call createBudget and reload on success', async () => {
    component.createForm.setValue({
      trip_name: 'Paris Trip', total_budget: 1500,
      currency: 'USD', start_date: '', end_date: '', notes: ''
    });
    component.submitCreateBudget();
    await fixture.whenStable();
    expect(mockBudgetService.createBudget).toHaveBeenCalled();
    expect(component.showCreateForm).toBe(false);
  });

  // ── deleteBudget ─────────────────────────────────────────────────────────
  it('deleteBudget: should call deleteBudget on service', async () => {
    component.deleteBudget(MOCK_BUDGET);
    await fixture.whenStable();
    expect(mockBudgetService.deleteBudget).toHaveBeenCalledWith(1);
  });

  // ── submitExpense — invalid ──────────────────────────────────────────────
  it('submitExpense: should not call service if form is invalid', () => {
    component.expenseForm.reset();
    component.submitExpense();
    expect(mockBudgetService.addExpense).not.toHaveBeenCalled();
  });

  // ── submitExpense — valid ────────────────────────────────────────────────
  it('submitExpense: should call addExpense on valid form', async () => {
    component.selectedBudget = MOCK_BUDGET;
    component.expenseForm.setValue({
      category: 'Transport', amount: 50,
      description: 'Taxi', expense_date: '2025-06-03'
    });
    component.submitExpense();
    await fixture.whenStable();
    expect(mockBudgetService.addExpense).toHaveBeenCalledWith(1, expect.objectContaining({ category: 'Transport', amount: 50 }));
  });

  // ── submitExpense — edit mode ────────────────────────────────────────────
  it('submitExpense: should call updateExpense when editing', async () => {
    component.selectedBudget = MOCK_BUDGET;
    component.editingExpense = MOCK_EXPENSES[0];
    component.expenseForm.setValue({
      category: 'Transport', amount: 100,
      description: 'Updated', expense_date: '2025-06-03'
    });
    component.submitExpense();
    await fixture.whenStable();
    expect(mockBudgetService.updateExpense).toHaveBeenCalledWith(1, 1, expect.objectContaining({ category: 'Transport', amount: 100 }));
  });

  // ── deleteExpense ────────────────────────────────────────────────────────
  it('deleteExpense: should call deleteExpense on service', async () => {
    component.selectedBudget = MOCK_BUDGET;
    component.deleteExpense(MOCK_EXPENSES[0]);
    await fixture.whenStable();
    expect(mockBudgetService.deleteExpense).toHaveBeenCalledWith(1, 1);
  });

  // ── startEditExpense ─────────────────────────────────────────────────────
  it('startEditExpense: should set editingExpense and populate form', () => {
    component.startEditExpense(MOCK_EXPENSES[0]);
    expect(component.editingExpense).toEqual(MOCK_EXPENSES[0]);
    expect(component.showExpenseForm).toBe(true);
    expect(component.expenseForm.value.category).toBe('Accommodation');
    expect(component.expenseForm.value.amount).toBe(400);
  });

  // ── getSpentPercentage ───────────────────────────────────────────────────
  it('getSpentPercentage: should return 0 when no selectedBudget', () => {
    component.selectedBudget = null;
    expect(component.getSpentPercentage()).toBe(0);
  });

  it('getSpentPercentage: should delegate to service when budget selected', () => {
    component.selectedBudget = MOCK_BUDGET;
    expect(component.getSpentPercentage()).toBe(40);
  });

  // ── getProgressColor ─────────────────────────────────────────────────────
  it('getProgressColor: should return primary for < 70%', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(50);
    component.selectedBudget = MOCK_BUDGET;
    expect(component.getProgressColor()).toBe('primary');
  });

  it('getProgressColor: should return accent for 70-89%', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(75);
    component.selectedBudget = MOCK_BUDGET;
    expect(component.getProgressColor()).toBe('accent');
  });

  it('getProgressColor: should return warn for >= 90%', () => {
    mockBudgetService.getSpentPercentage.mockReturnValue(95);
    component.selectedBudget = MOCK_BUDGET;
    expect(component.getProgressColor()).toBe('warn');
  });

  // ── formatCurrency ───────────────────────────────────────────────────────
  it('formatCurrency: should format as USD', () => {
    component.selectedBudget = MOCK_BUDGET;
    expect(component.formatCurrency(1234.5)).toContain('1,234.50');
  });

  // ── getCategoryIcon ──────────────────────────────────────────────────────
  it('getCategoryIcon: should return correct icon', () => {
    expect(component.getCategoryIcon('Accommodation')).toBe('hotel');
    expect(component.getCategoryIcon('Transport')).toBe('directions_car');
  });

  it('getCategoryIcon: should return fallback for unknown', () => {
    expect(component.getCategoryIcon('Unknown')).toBe('receipt');
  });

  // ── getCategoryColor ─────────────────────────────────────────────────────
  it('getCategoryColor: should return correct color', () => {
    expect(component.getCategoryColor('Accommodation')).toBe('#667eea');
  });

  it('getCategoryColor: should return fallback for unknown', () => {
    expect(component.getCategoryColor('XYZ')).toBe('#64748b');
  });

  // ── trackByExpenseId ─────────────────────────────────────────────────────
  it('trackByExpenseId: should return expense id', () => {
    expect(component.trackByExpenseId(0, MOCK_EXPENSES[0])).toBe(1);
  });

  // ── trackByBudgetId ──────────────────────────────────────────────────────
  it('trackByBudgetId: should return budget id', () => {
    expect(component.trackByBudgetId(0, MOCK_BUDGET)).toBe(1);
  });
});