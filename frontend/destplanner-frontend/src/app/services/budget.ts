import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Budget {
  id: number;
  user_id: number;
  trip_name: string;
  total_budget: number;
  spent_amount: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  id: number;
  user_id: number;
  trip_name: string;
  total_budget: number;
  spent_amount: number;
  remaining_budget: number;
  percentage_used: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  budget_id: number;
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
  created_at: string;
}

export interface CreateBudgetPayload {
  trip_name: string;
  total_budget: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface CreateExpensePayload {
  category: string;
  amount: number;
  description?: string;
  expense_date?: string;
}

export const EXPENSE_CATEGORIES = [
  'Accommodation',
  'Food & Dining',
  'Transport',
  'Activities',
  'Shopping',
  'Health',
  'Other',
];

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private baseUrl = environment.apiUrl;

  private budgetsSubject = new BehaviorSubject<BudgetSummary[]>([]);
  budgets$ = this.budgetsSubject.asObservable();

  private selectedBudgetSubject = new BehaviorSubject<BudgetSummary | null>(null);
  selectedBudget$ = this.selectedBudgetSubject.asObservable();

  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  expenses$ = this.expensesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // POST /api/budgets
  createBudget(payload: CreateBudgetPayload): Observable<{ message: string; budget_id: number }> {
    return this.http.post<{ message: string; budget_id: number }>(
      `${this.baseUrl}/budgets`, payload
    );
  }

  // GET /api/budgets
  getBudgets(): Observable<{ budgets: BudgetSummary[] }> {
    return this.http.get<{ budgets: BudgetSummary[] }>(`${this.baseUrl}/budgets`).pipe(
      tap((res) => this.budgetsSubject.next(res.budgets ?? []))
    );
  }

  // GET /api/budgets/:id
  getBudgetById(id: number): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(`${this.baseUrl}/budgets/${id}`).pipe(
      tap((budget) => this.selectedBudgetSubject.next(budget))
    );
  }

  // PUT /api/budgets/:id
  updateBudget(id: number, payload: Partial<CreateBudgetPayload>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/budgets/${id}`, payload);
  }

  // DELETE /api/budgets/:id
  deleteBudget(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/budgets/${id}`);
  }

  // POST /api/budgets/:id/expenses
  addExpense(budgetId: number, payload: CreateExpensePayload): Observable<{ message: string; expense_id: number }> {
    return this.http.post<{ message: string; expense_id: number }>(
      `${this.baseUrl}/budgets/${budgetId}/expenses`, payload
    );
  }

  // GET /api/budgets/:id/expenses
  getExpenses(budgetId: number): Observable<{ expenses: Expense[] }> {
    return this.http.get<{ expenses: Expense[] }>(
      `${this.baseUrl}/budgets/${budgetId}/expenses`
    ).pipe(
      tap((res) => this.expensesSubject.next(res.expenses ?? []))
    );
  }

  // PUT /api/budgets/:id/expenses/:expenseId
  updateExpense(budgetId: number, expenseId: number, payload: CreateExpensePayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/budgets/${budgetId}/expenses/${expenseId}`, payload
    );
  }

  // DELETE /api/budgets/:id/expenses/:expenseId
  deleteExpense(budgetId: number, expenseId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/budgets/${budgetId}/expenses/${expenseId}`
    );
  }

  // Helper: compute per-category totals
  getCategoryTotals(expenses: Expense[]): { category: string; total: number }[] {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  // Helper: percentage spent (capped at 100)
  getSpentPercentage(budget: BudgetSummary): number {
    if (!budget.total_budget || budget.total_budget === 0) return 0;
    return Math.min(Math.round((budget.spent_amount / budget.total_budget) * 100), 100);
  }

  // Helper: update local summary after add/delete expense
  updateLocalSummary(summary: BudgetSummary): void {
    this.selectedBudgetSubject.next(summary);
  }

  setSelectedBudget(budget: BudgetSummary | null): void {
    this.selectedBudgetSubject.next(budget);
  }
}