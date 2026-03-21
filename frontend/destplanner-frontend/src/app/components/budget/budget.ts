import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  budgets: BudgetSummary[] = [];
  selectedBudget: BudgetSummary | null = null;
  expenses: Expense[] = [];
  categoryTotals: { category: string; total: number }[] = [];
  categories = EXPENSE_CATEGORIES;

  showCreateForm = false;
  showExpenseForm = false;
  editingExpense: Expense | null = null;
  loadingBudgets = false;
  loadingExpenses = false;
  savingBudget = false;
  savingExpense = false;

  private subs = new Subscription();

  createForm: ReturnType<FormBuilder['group']>;
  expenseForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private snack: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.createForm = this.fb.group({
      trip_name: ['', Validators.required],
      total_budget: ['', [Validators.required, Validators.min(1)]],
      currency: ['USD'],
      start_date: [''],
      end_date: [''],
      notes: [''],
    });

    this.expenseForm = this.fb.group({
      category: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: [''],
      expense_date: [new Date().toISOString().slice(0, 10)],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadBudgets();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadBudgets(): void {
    this.loadingBudgets = true;

    const timeout = setTimeout(() => {
      this.loadingBudgets = false;
      this.cdr.detectChanges();
    }, 5000);

    this.budgetService.getBudgets().subscribe({
      next: (res) => {
        clearTimeout(timeout);
        console.log('getBudgets response:', res);
        this.budgets = res?.budgets ?? [];
        console.log('budgets array:', this.budgets);
        this.loadingBudgets = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timeout);
        this.loadingBudgets = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.snack.open('Session expired. Please log in again.', 'Close', { duration: 3000 });
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/budget' } });
        } else {
          this.snack.open('Failed to load budgets.', 'Close', { duration: 3000 });
        }
      },
    });
  }

  selectBudget(budget: BudgetSummary): void {
    this.selectedBudget = budget;
    this.showExpenseForm = false;
    this.loadExpenses(budget.id);
  }

  backToList(): void {
    this.selectedBudget = null;
    this.expenses = [];
    this.categoryTotals = [];
    this.loadBudgets();
  }

  loadExpenses(budgetId: number): void {
    this.loadingExpenses = true;
    this.budgetService.getExpenses(budgetId).subscribe({
      next: (res) => {
        this.expenses = res?.expenses ?? [];
        this.categoryTotals = this.budgetService.getCategoryTotals(this.expenses);
        this.loadingExpenses = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingExpenses = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) this.createForm.reset({ currency: 'USD' });
  }

  submitCreateBudget(): void {
    if (this.createForm.invalid) {
      this.snack.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }
    this.savingBudget = true;
    this.cdr.detectChanges();
    const { trip_name, total_budget, currency, start_date, end_date, notes } = this.createForm.value;

    this.budgetService.createBudget({
      trip_name, total_budget: Number(total_budget),
      currency: currency || 'USD',
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      notes: notes || undefined,
    }).subscribe({
      next: () => {
        this.savingBudget = false;
        this.showCreateForm = false;
        this.createForm.reset({ currency: 'USD' });
        this.cdr.detectChanges();
        this.snack.open('Budget created!', 'OK', { duration: 2500 });
        this.loadBudgets();
      },
      error: (err) => {
        this.savingBudget = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to create budget.', 'Close', { duration: 3000 });
      },
    });
  }

  deleteBudget(budget: BudgetSummary): void {
    this.budgetService.deleteBudget(budget.id).subscribe({
      next: () => {
        this.snack.open('Budget deleted.', 'OK', { duration: 2000 });
        this.loadBudgets();
      },
      error: () => this.snack.open('Failed to delete budget.', 'Close', { duration: 3000 }),
    });
  }

  toggleExpenseForm(): void {
    this.showExpenseForm = !this.showExpenseForm;
    this.editingExpense = null;
    if (!this.showExpenseForm) {
      this.expenseForm.reset({ expense_date: new Date().toISOString().slice(0, 10) });
    }
  }

  startEditExpense(expense: Expense): void {
    this.editingExpense = expense;
    this.showExpenseForm = true;
    this.expenseForm.patchValue({
      category: expense.category,
      amount: expense.amount,
      description: expense.description || '',
      expense_date: expense.expense_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
  }

  submitExpense(): void {
    if (this.expenseForm.invalid || !this.selectedBudget) return;
    this.savingExpense = true;
    this.cdr.detectChanges();
    const { category, amount, description, expense_date } = this.expenseForm.value;
    const budgetId = this.selectedBudget.id;

    const payload = {
      category, amount: Number(amount),
      description: description || undefined,
      expense_date: expense_date || undefined,
    };

    // Update existing expense
    if (this.editingExpense) {
      this.budgetService.updateExpense(budgetId, this.editingExpense.id, payload).subscribe({
        next: () => {
          this.savingExpense = false;
          this.showExpenseForm = false;
          this.editingExpense = null;
          this.expenseForm.reset({ expense_date: new Date().toISOString().slice(0, 10) });
          this.cdr.detectChanges();
          this.snack.open('Expense updated!', 'OK', { duration: 2500 });
          this.budgetService.getBudgetById(budgetId).subscribe((updated) => {
            this.selectedBudget = updated;
            this.cdr.detectChanges();
          });
          this.loadExpenses(budgetId);
        },
        error: (err) => {
          this.savingExpense = false;
          this.cdr.detectChanges();
          this.snack.open(err?.error?.message || 'Failed to update expense.', 'Close', { duration: 3000 });
        },
      });
      return;
    }

    // Add new expense
    this.budgetService.addExpense(budgetId, payload).subscribe({
      next: () => {
        this.savingExpense = false;
        this.showExpenseForm = false;
        this.expenseForm.reset({ expense_date: new Date().toISOString().slice(0, 10) });
        this.cdr.detectChanges();
        this.snack.open('Expense added!', 'OK', { duration: 2500 });
        this.budgetService.getBudgetById(budgetId).subscribe((updated) => {
          this.selectedBudget = updated;
          this.cdr.detectChanges();
        });
        this.loadExpenses(budgetId);
      },
      error: (err) => {
        this.savingExpense = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to add expense.', 'Close', { duration: 3000 });
      },
    });
  }

  deleteExpense(expense: Expense): void {
    if (!this.selectedBudget) return;
    const budgetId = this.selectedBudget.id;
    this.budgetService.deleteExpense(budgetId, expense.id).subscribe({
      next: () => {
        this.snack.open('Expense removed.', 'OK', { duration: 2000 });
        this.budgetService.getBudgetById(budgetId).subscribe((updated) => {
          this.selectedBudget = updated;
          this.cdr.detectChanges();
        });
        this.loadExpenses(budgetId);
      },
      error: () => this.snack.open('Failed to delete expense.', 'Close', { duration: 3000 }),
    });
  }

  getSpentPercentage(): number {
    if (!this.selectedBudget) return 0;
    return this.budgetService.getSpentPercentage(this.selectedBudget);
  }

  getProgressColor(): string {
    const pct = this.getSpentPercentage();
    if (pct >= 90) return 'warn';
    if (pct >= 70) return 'accent';
    return 'primary';
  }

  formatCurrency(amount: number, currency?: string): string {
    const c = currency || this.selectedBudget?.currency || 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(amount);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Accommodation': 'hotel', 'Food & Dining': 'restaurant',
      'Transport': 'directions_car', 'Activities': 'local_activity',
      'Shopping': 'shopping_bag', 'Health': 'medical_services', 'Other': 'more_horiz',
    };
    return icons[category] ?? 'receipt';
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Accommodation': '#667eea', 'Food & Dining': '#f6a623',
      'Transport': '#50c878', 'Activities': '#ff6b9d',
      'Shopping': '#a855f7', 'Health': '#ef4444', 'Other': '#64748b',
    };
    return colors[category] ?? '#64748b';
  }

  trackByExpenseId(_: number, expense: Expense): number { return expense.id; }
  trackByBudgetId(_: number, budget: BudgetSummary): number { return budget.id; }
}