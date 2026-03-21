import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  BudgetService,
  BudgetSummary,
  Expense,
  EXPENSE_CATEGORIES,
} from '../../services/budget';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './budget.html',
  styleUrls: ['./budget.css'],
})
export class BudgetComponent implements OnInit, OnDestroy {
  tripId = 'default-trip';
  summary: BudgetSummary | null = null;
  categoryTotals: { category: string; total: number }[] = [];
  categories = EXPENSE_CATEGORIES;

  // Which panel is open
  showBudgetForm = false;
  showExpenseForm = false;

  loadingBudget = false;
  loadingExpense = false;
  loadingSummary = false;

  private summarySubscription!: Subscription;

  budgetForm: ReturnType<FormBuilder['group']>;
  expenseForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private snack: MatSnackBar,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.budgetForm = this.fb.group({
      total_budget: ['', [Validators.required, Validators.min(1)]],
      currency: ['USD'],
    });

    this.expenseForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', Validators.required],
      description: [''],
      date: [new Date().toISOString().slice(0, 10)],
    });
  }

  ngOnInit(): void {
    // Allow trip ID to come from the route, e.g. /budget/:tripId
    const paramTripId = this.route.snapshot.paramMap.get('tripId');
    if (paramTripId) {
      this.tripId = paramTripId;
    }

    // Subscribe to reactive summary updates from the service
    this.summarySubscription = this.budgetService.summary$.subscribe((s) => {
      if (s) {
        this.summary = s;
        this.categoryTotals = this.budgetService.getCategoryTotals(s.expenses ?? []);
      }
    });

    // Only load from backend in the browser — skip during SSR to avoid timeout
    if (isPlatformBrowser(this.platformId)) {
      this.loadSummary();
    } else {
      this.loadingSummary = false;
      this.summary = {
        trip_id: this.tripId,
        total_budget: 0,
        total_expenses: 0,
        remaining_budget: 0,
        currency: 'USD',
        expenses: [],
      };
    }
  }

  ngOnDestroy(): void {
    this.summarySubscription?.unsubscribe();
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  loadSummary(): void {
    this.loadingSummary = true;

    // Fallback after 3 seconds if backend is unreachable
    const timeout = setTimeout(() => {
      this.loadingSummary = false;
      if (!this.summary) {
        this.summary = {
          trip_id: this.tripId,
          total_budget: 0,
          total_expenses: 0,
          remaining_budget: 0,
          currency: 'USD',
          expenses: [],
        };
      }
    }, 3000);

    this.budgetService.getBudgetSummary(this.tripId).subscribe({
      next: () => {
        clearTimeout(timeout);
        this.loadingSummary = false;
      },
      error: () => {
        clearTimeout(timeout);
        this.loadingSummary = false;
        this.summary = {
          trip_id: this.tripId,
          total_budget: 0,
          total_expenses: 0,
          remaining_budget: 0,
          currency: 'USD',
          expenses: [],
        };
      },
    });
  }

  // ─── Budget form ─────────────────────────────────────────────────────────────

  toggleBudgetForm(): void {
    this.showBudgetForm = !this.showBudgetForm;
    this.showExpenseForm = false;
    if (this.showBudgetForm && this.summary?.total_budget) {
      this.budgetForm.patchValue({
        total_budget: this.summary.total_budget,
        currency: this.summary.currency,
      });
    }
  }

  submitBudget(): void {
    if (this.budgetForm.invalid) {
      this.snack.open('Please enter a valid budget amount.', 'Close', { duration: 3000 });
      return;
    }

    this.loadingBudget = true;
    const { total_budget, currency } = this.budgetForm.value;

    this.budgetService
      .setBudget({ trip_id: this.tripId, total_budget: Number(total_budget), currency })
      .subscribe({
        next: () => {
          this.snack.open('Budget saved!', 'OK', { duration: 2500 });
          this.showBudgetForm = false;
          this.loadingBudget = false;
        },
        error: () => {
          // Optimistic local update if backend is unavailable
          const budget = Number(total_budget);
          const current = this.summary ?? {
            trip_id: this.tripId,
            total_expenses: 0,
            expenses: [],
            currency: currency ?? 'USD',
          };
          const updated: BudgetSummary = {
            ...current,
            total_budget: budget,
            remaining_budget: budget - (current.total_expenses ?? 0),
            currency: currency ?? 'USD',
          };
          this.budgetService.updateLocalSummary(updated);
          this.snack.open('Budget saved locally (backend offline).', 'OK', { duration: 3000 });
          this.showBudgetForm = false;
          this.loadingBudget = false;
        },
      });
  }

  // ─── Expense form ─────────────────────────────────────────────────────────────

  toggleExpenseForm(): void {
    this.showExpenseForm = !this.showExpenseForm;
    this.showBudgetForm = false;
    if (!this.showExpenseForm) {
      this.expenseForm.reset({
        date: new Date().toISOString().slice(0, 10),
        category: '',
      });
    }
  }

  submitExpense(): void {
    if (this.expenseForm.invalid) {
      this.snack.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }

    this.loadingExpense = true;
    const { amount, category, description, date } = this.expenseForm.value;

    const expense: Omit<Expense, 'id'> = {
      trip_id: this.tripId,
      amount: Number(amount),
      category,
      description: description ?? '',
      date: date ?? new Date().toISOString().slice(0, 10),
    };

    this.budgetService.addExpense(expense).subscribe({
      next: () => {
        this.snack.open('Expense added!', 'OK', { duration: 2500 });
        this.expenseForm.reset({ date: new Date().toISOString().slice(0, 10), category: '' });
        this.showExpenseForm = false;
        this.loadingExpense = false;
      },
      error: () => {
        // Optimistic local update
        if (this.summary) {
          const newExpense: Expense = { ...expense, id: Date.now() };
          const updatedExpenses = [newExpense, ...(this.summary.expenses ?? [])];
          const newTotal = this.summary.total_expenses + expense.amount;
          const updated: BudgetSummary = {
            ...this.summary,
            expenses: updatedExpenses,
            total_expenses: newTotal,
            remaining_budget: this.summary.total_budget - newTotal,
          };
          this.budgetService.updateLocalSummary(updated);
        }
        this.snack.open('Expense added locally (backend offline).', 'OK', { duration: 3000 });
        this.expenseForm.reset({ date: new Date().toISOString().slice(0, 10), category: '' });
        this.showExpenseForm = false;
        this.loadingExpense = false;
      },
    });
  }

  // ─── Delete expense ───────────────────────────────────────────────────────────

  deleteExpense(expense: Expense): void {
    if (expense.id === undefined) return;

    this.budgetService.deleteExpense(expense.id, this.tripId).subscribe({
      next: () => {
        this.snack.open('Expense removed.', 'OK', { duration: 2000 });
      },
      error: () => {
        // Optimistic local delete
        if (this.summary) {
          const remaining = (this.summary.expenses ?? []).filter((e) => e.id !== expense.id);
          const newTotal = remaining.reduce((sum, e) => sum + e.amount, 0);
          const updated: BudgetSummary = {
            ...this.summary,
            expenses: remaining,
            total_expenses: newTotal,
            remaining_budget: this.summary.total_budget - newTotal,
          };
          this.budgetService.updateLocalSummary(updated);
        }
        this.snack.open('Expense removed locally.', 'OK', { duration: 2000 });
      },
    });
  }

  // ─── Template helpers ─────────────────────────────────────────────────────────

  getSpentPercentage(): number {
    if (!this.summary) return 0;
    return this.budgetService.getSpentPercentage(this.summary);
  }

  getProgressColor(): string {
    const pct = this.getSpentPercentage();
    if (pct >= 90) return 'warn';
    if (pct >= 70) return 'accent';
    return 'primary';
  }

  formatCurrency(amount: number): string {
    const currency = this.summary?.currency ?? 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Accommodation': 'hotel',
      'Food & Dining': 'restaurant',
      'Transport': 'directions_car',
      'Activities': 'local_activity',
      'Shopping': 'shopping_bag',
      'Health': 'medical_services',
      'Other': 'more_horiz',
    };
    return icons[category] ?? 'receipt';
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Accommodation': '#667eea',
      'Food & Dining': '#f6a623',
      'Transport': '#50c878',
      'Activities': '#ff6b9d',
      'Shopping': '#a855f7',
      'Health': '#ef4444',
      'Other': '#64748b',
    };
    return colors[category] ?? '#64748b';
  }

  trackByExpenseId(_: number, expense: Expense): number | string {
    return expense.id ?? expense.description;
  }
}