import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
 
export interface Expense {
  id?: number;
  trip_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}
 
export interface BudgetSummary {
  trip_id: string;
  total_budget: number;
  total_expenses: number;
  remaining_budget: number;
  currency: string;
  expenses: Expense[];
}
 
export interface SetBudgetPayload {
  trip_id: string;
  total_budget: number;
  currency?: string;
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
 
  // Local state so the dashboard reacts immediately without extra GET calls
  private summarySubject = new BehaviorSubject<BudgetSummary | null>(null);
  summary$ = this.summarySubject.asObservable();
 
  constructor(private http: HttpClient) {}
 
  // POST /expenses/budget  — set or update the budget for a trip
  setBudget(payload: SetBudgetPayload): Observable<BudgetSummary> {
    return this.http
      .post<BudgetSummary>(`${this.baseUrl}/expenses/budget`, payload)
      .pipe(tap((summary) => this.summarySubject.next(summary)));
  }
 
  // POST /expenses  — add a single expense to a trip
  addExpense(expense: Omit<Expense, 'id'>): Observable<Expense> {
    return this.http.post<Expense>(`${this.baseUrl}/expenses`, expense).pipe(
      tap(() => {
        // After adding an expense, refresh the summary
        this.getBudgetSummary(expense.trip_id).subscribe();
      })
    );
  }
 
  // GET /expenses?tripId=  — fetch all expenses for a trip
  getExpenses(tripId: string): Observable<Expense[]> {
    const params = new HttpParams().set('tripId', tripId);
    return this.http.get<Expense[]>(`${this.baseUrl}/expenses`, { params });
  }
 
  // GET /budget/{tripId}  — fetch budget summary (budget + computed totals)
  getBudgetSummary(tripId: string): Observable<BudgetSummary> {
    return this.http
      .get<BudgetSummary>(`${this.baseUrl}/budget/${tripId}`)
      .pipe(tap((summary) => this.summarySubject.next(summary)));
  }
 
  // DELETE /expenses/{id}  — remove one expense
  deleteExpense(expenseId: number, tripId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/expenses/${expenseId}`)
      .pipe(
        tap(() => {
          this.getBudgetSummary(tripId).subscribe();
        })
      );
  }
 
  // Helper: compute per-category totals from an expense list
  getCategoryTotals(expenses: Expense[]): { category: string; total: number }[] {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }
 
  // Helper: what percentage of the budget has been spent (0-100, capped at 100)
  getSpentPercentage(summary: BudgetSummary): number {
    if (!summary.total_budget || summary.total_budget === 0) return 0;
    const pct = (summary.total_expenses / summary.total_budget) * 100;
    return Math.min(Math.round(pct), 100);
  }
 
  // Helper: push an updated summary directly (used by the component during offline/mock mode)
  updateLocalSummary(summary: BudgetSummary): void {
    this.summarySubject.next(summary);
  }
}