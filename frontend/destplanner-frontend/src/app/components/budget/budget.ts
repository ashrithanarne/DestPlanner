import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  BudgetService,
  BudgetSummary,
  Expense,
  EXPENSE_CATEGORIES,
} from '../../services/budget';
import { TripService, Trip } from '../../services/trip.service';

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
    MatProgressSpinnerModule,
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

  trips: Trip[] = [];
  tripsMap: Record<number, Trip> = {};
  loadingTrips = false;

  showCreateForm = false;
  showExpenseForm = false;

  // Edit budget state
  editingBudget: BudgetSummary | null = null;
  savingBudgetEdit = false;

  editingExpense: Expense | null = null;
  loadingBudgets = false;
  loadingExpenses = false;
  savingBudget = false;
  savingExpense = false;

  private subs = new Subscription();

  createForm: ReturnType<FormBuilder['group']>;
  editBudgetForm: ReturnType<FormBuilder['group']>;
  expenseForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private tripService: TripService,
    private snack: MatSnackBar,
    public router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.createForm = this.fb.group({
      trip_id: [null, Validators.required],
      total_budget: ['', [Validators.required, Validators.min(1)]],
      currency: ['USD'],
      notes: [''],
    });

    this.editBudgetForm = this.fb.group({
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
      window.scrollTo(0, 0);
      // Load both budgets and trips, then handle ?trip_id once BOTH resolve.
      // This lets us check for an existing budget before deciding to show
      // the create form vs. opening the existing budget detail.
      let budgetsLoaded = false;
      let tripsLoaded = false;

      const handleTripIdParam = () => {
        if (!budgetsLoaded || !tripsLoaded) return;
        const tripIdParam = this.route.snapshot.queryParamMap.get('trip_id');
        if (!tripIdParam) return;
        const tripId = Number(tripIdParam);
        const existing = this.budgets.find(b => b.trip_id === tripId);
        if (existing) {
          // Budget already exists — open it directly
          this.selectBudget(existing);
        } else {
          // No budget yet — pre-fill the create form
          this.showCreateForm = true;
          this.createForm.patchValue({ trip_id: tripId });
        }
        this.cdr.detectChanges();
      };

      this.loadingBudgets = true;
      this.budgetService.getBudgets().subscribe({
        next: (res) => {
          this.budgets = res?.budgets ?? [];
          this.loadingBudgets = false;
          budgetsLoaded = true;
          this.cdr.detectChanges();
          handleTripIdParam();
        },
        error: (err) => {
          this.loadingBudgets = false;
          budgetsLoaded = true;
          this.cdr.detectChanges();
          if (err.status === 401) {
            this.snack.open('Session expired. Please log in again.', 'Close', { duration: 3000 });
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/budget' } });
          } else {
            this.snack.open('Failed to load budgets.', 'Close', { duration: 3000 });
          }
        },
      });

      this.loadTrips(() => {
        tripsLoaded = true;
        handleTripIdParam();
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Trips ─────────────────────────────────────────────────────────────────

  loadTrips(onComplete?: () => void): void {
    this.loadingTrips = true;
    this.tripService.getTrips().subscribe({
      next: (res) => {
        this.trips = res?.trips ?? [];
        this.tripsMap = {};
        for (const t of this.trips) this.tripsMap[t.id] = t;
        this.loadingTrips = false;
        this.cdr.detectChanges();
        onComplete?.();
      },
      error: () => {
        this.loadingTrips = false;
        this.cdr.detectChanges();
        onComplete?.();
      },
    });
  }

  getSelectedTrip(): Trip | undefined {
    const tripId = this.createForm.get('trip_id')?.value;
    return this.trips.find(t => t.id === tripId);
  }

  // ── Budgets ───────────────────────────────────────────────────────────────

  loadBudgets(): void {
    this.loadingBudgets = true;
    const timeout = setTimeout(() => {
      this.loadingBudgets = false;
      this.cdr.detectChanges();
    }, 5000);

    this.budgetService.getBudgets().subscribe({
      next: (res) => {
        clearTimeout(timeout);
        this.budgets = res?.budgets ?? [];
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
    if (this.editingBudget?.id === budget.id) return; // don't nav while editing
    this.selectedBudget = budget;
    this.editingBudget = null;
    this.showExpenseForm = false;
    this.loadExpenses(budget.id);
  }

  backToList(): void {
    this.selectedBudget = null;
    this.editingBudget = null;
    this.expenses = [];
    this.categoryTotals = [];
    this.loadBudgets();
  }

  // ── Create Budget ─────────────────────────────────────────────────────────

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset({ currency: 'USD', trip_id: null });
    }
  }

  submitCreateBudget(): void {
    if (this.createForm.invalid) {
      this.snack.open('Please select a trip and enter a budget amount.', 'Close', { duration: 3000 });
      return;
    }

    const { trip_id, total_budget, currency, notes } = this.createForm.value;
    const selectedTrip = this.getSelectedTrip();
    if (!selectedTrip) {
      this.snack.open('Selected trip not found. Please try again.', 'Close', { duration: 3000 });
      return;
    }

    this.savingBudget = true;
    this.cdr.detectChanges();

    this.budgetService.createBudget({
      trip_id: Number(trip_id),
      trip_name: selectedTrip.trip_name,
      total_budget: Number(total_budget),
      currency: currency || 'USD',
      start_date: selectedTrip.start_date || undefined,
      end_date: selectedTrip.end_date || undefined,
      notes: notes || undefined,
    }).subscribe({
      next: () => {
        this.savingBudget = false;
        this.showCreateForm = false;
        this.createForm.reset({ currency: 'USD', trip_id: null });
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
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

  // ── Edit Budget ───────────────────────────────────────────────────────────

  startEditBudget(budget: BudgetSummary, event?: Event): void {
    event?.stopPropagation();
    this.editingBudget = budget;
    this.showCreateForm = false;
    this.editBudgetForm.patchValue({
      trip_name: budget.trip_name,
      total_budget: budget.total_budget,
      currency: budget.currency,
      start_date: budget.start_date ? budget.start_date.slice(0, 10) : '',
      end_date: budget.end_date ? budget.end_date.slice(0, 10) : '',
      notes: budget.notes || '',
    });
    this.cdr.detectChanges();
  }

  cancelEditBudget(): void {
    this.editingBudget = null;
    this.editBudgetForm.reset({ currency: 'USD' });
    this.cdr.detectChanges();
  }

  submitEditBudget(): void {
    if (!this.editingBudget || this.editBudgetForm.invalid) return;
    this.savingBudgetEdit = true;
    this.cdr.detectChanges();

    const { trip_name, total_budget, currency, start_date, end_date, notes } = this.editBudgetForm.value;

    this.budgetService.updateBudget(this.editingBudget.id, {
      trip_name: trip_name || undefined,
      total_budget: Number(total_budget),
      currency: currency || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      notes: notes || undefined,
    }).subscribe({
      next: () => {
        this.savingBudgetEdit = false;
        // If editing from detail view, refresh the selected budget
        if (this.selectedBudget?.id === this.editingBudget!.id) {
          this.budgetService.getBudgetById(this.editingBudget!.id).subscribe((updated) => {
            this.selectedBudget = updated;
            this.editingBudget = null;
            this.cdr.detectChanges();
          });
        } else {
          this.editingBudget = null;
        }
        this.cdr.detectChanges();
        this.snack.open('Budget updated!', 'OK', { duration: 2500 });
        this.loadBudgets();
      },
      error: (err) => {
        this.savingBudgetEdit = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to update budget.', 'Close', { duration: 3000 });
      },
    });
  }

  // ── Delete Budget ─────────────────────────────────────────────────────────

  deleteBudget(budget: BudgetSummary, event?: Event): void {
    event?.stopPropagation();
    this.budgetService.deleteBudget(budget.id).subscribe({
      next: () => {
        this.snack.open('Budget deleted.', 'OK', { duration: 2000 });
        if (this.selectedBudget?.id === budget.id) this.backToList();
        else this.loadBudgets();
      },
      error: () => this.snack.open('Failed to delete budget.', 'Close', { duration: 3000 }),
    });
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  getTripStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      planning: 'Planning', ongoing: 'Ongoing',
      completed: 'Completed', cancelled: 'Cancelled',
    };
    return labels[status] ?? status;
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
  trackByTripId(_: number, trip: Trip): number { return trip.id; }
}