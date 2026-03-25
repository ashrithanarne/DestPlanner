import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';

import {
  GroupService, Group, GroupExpense, GroupMemberDetail,
  Balance, CreateGroupExpensePayload, SplitInput, EXPENSE_CATEGORIES,
} from '../../services/group.service';

type SplitMode = 'equal' | 'custom' | 'percentage';

@Component({
  selector: 'app-expense-split',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressBarModule, MatSnackBarModule, MatDividerModule,
    MatTooltipModule, MatTabsModule, MatChipsModule, MatRadioModule,
  ],
  templateUrl: './expense-split.html',
  styleUrls: ['./expense-split.css'],
})
export class ExpenseSplitComponent implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  groups: Group[] = [];
  selectedGroup: Group | null = null;
  expenses: GroupExpense[] = [];
  balances: Balance[] = [];

  loadingGroups = false;
  loadingExpenses = false;
  loadingBalances = false;
  savingGroup = false;
  savingExpense = false;
  settlingId: number | null = null;

  showCreateGroupForm = false;
  showAddExpenseForm = false;

  splitMode: SplitMode = 'equal';
  splitTotal = 0;
  splitError = '';

  categories = EXPENSE_CATEGORIES;
  private subs = new Subscription();

  // ── Forms ─────────────────────────────────────────────────────────────────
  createGroupForm: ReturnType<FormBuilder['group']>;
  expenseForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    public groupService: GroupService,
    private snack: MatSnackBar,
    public router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.createGroupForm = this.fb.group({
      group_name: ['', Validators.required],
    });

    this.expenseForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['Food & Dining', Validators.required],
      description: [''],
      expense_date: [new Date().toISOString().slice(0, 10)],
      split_mode: ['equal'],
      splits: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
      this.loadGroups();
    }
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ── Getters ───────────────────────────────────────────────────────────────

  get splitsArray(): FormArray {
    return this.expenseForm.get('splits') as FormArray;
  }

  get currentSplitTotal(): number {
    return this.splitsArray.controls.reduce(
      (sum, ctrl) => sum + (Number(ctrl.get('amount_owed')?.value) || 0), 0
    );
  }

  get expenseAmount(): number {
    return Number(this.expenseForm.get('amount')?.value) || 0;
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  loadGroups(): void {
    this.loadingGroups = true;
    this.groupService.getGroups().subscribe({
      next: res => {
        this.groups = res.groups ?? [];
        this.loadingGroups = false;
        this.cdr.detectChanges();
        if (this.selectedGroup) {
          this.loadExpenses();
          this.loadBalances();
        }
      },
      error: err => {
        this.loadingGroups = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.snack.open('Session expired. Please log in.', 'Close', { duration: 3000 });
          this.router.navigate(['/login']);
        } else {
          this.snack.open('Failed to load groups.', 'Close', { duration: 3000 });
        }
      },
    });
  }

  selectGroup(group: Group): void {
    this.selectedGroup = group;
    this.expenses = [];
    this.balances = [];
    this.showAddExpenseForm = false;
    this.loadExpenses();
    this.loadBalances();
  }

  backToGroups(): void {
    this.selectedGroup = null;
    this.expenses = [];
    this.balances = [];
    this.splitMode = 'equal';
    this.loadGroups();
  }

  toggleCreateGroupForm(): void {
    this.showCreateGroupForm = !this.showCreateGroupForm;
    if (!this.showCreateGroupForm) this.createGroupForm.reset();
  }

  submitCreateGroup(): void {
    if (this.createGroupForm.invalid) {
      this.snack.open('Group name is required.', 'Close', { duration: 3000 });
      return;
    }
    this.savingGroup = true;
    const { group_name } = this.createGroupForm.value;
    this.groupService.createGroup({ group_name }).subscribe({
      next: () => {
        this.savingGroup = false;
        this.showCreateGroupForm = false;
        this.createGroupForm.reset();
        this.cdr.detectChanges();
        this.snack.open('Group created!', 'OK', { duration: 2500 });
        this.loadGroups();
      },
      error: err => {
        this.savingGroup = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to create group.', 'Close', { duration: 3000 });
      },
    });
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  loadExpenses(): void {
    if (!this.selectedGroup) return;
    this.loadingExpenses = true;
    this.groupService.getGroupExpenses(this.selectedGroup.id).subscribe({
      next: res => {
        this.expenses = res.expenses ?? [];
        this.loadingExpenses = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingExpenses = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to load expenses.', 'Close', { duration: 3000 });
      },
    });
  }

  loadBalances(): void {
    if (!this.selectedGroup) return;
    this.loadingBalances = true;
    this.groupService.getGroupBalances(this.selectedGroup.id).subscribe({
      next: res => {
        this.balances = res.balances ?? [];
        this.loadingBalances = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingBalances = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleAddExpenseForm(): void {
    this.showAddExpenseForm = !this.showAddExpenseForm;
    if (!this.showAddExpenseForm) {
      this.resetExpenseForm();
    } else {
      this.onSplitModeChange('equal');
    }
  }

  onSplitModeChange(mode: string): void {
    this.splitMode = mode as SplitMode;
    this.splitsArray.clear();
    this.splitError = '';

    if ((mode === 'custom' || mode === 'percentage') && this.selectedGroup) {
      for (const m of this.selectedGroup.members) {
        this.splitsArray.push(this.fb.group({
          user_id: [m.user_id],
          first_name: [m.first_name],
          last_name: [m.last_name],
          amount_owed: ['', [Validators.required, Validators.min(0)]],
        }));
      }
    }
    this.cdr.detectChanges();
  }

  validateSplits(): boolean {
    const total = this.expenseAmount;
    if (this.splitMode === 'equal') return true;

    if (this.splitMode === 'percentage') {
      const pctSum = this.splitsArray.controls.reduce(
        (s, c) => s + (Number(c.get('amount_owed')?.value) || 0), 0
      );
      if (Math.abs(pctSum - 100) > 0.01) {
        this.splitError = `Percentages must add up to 100% (currently ${pctSum.toFixed(1)}%)`;
        return false;
      }
    }

    if (this.splitMode === 'custom') {
      const splitSum = this.currentSplitTotal;
      if (Math.abs(splitSum - total) > 0.01) {
        this.splitError = `Split amounts must equal $${total.toFixed(2)} (currently $${splitSum.toFixed(2)})`;
        return false;
      }
    }
    this.splitError = '';
    return true;
  }

  submitAddExpense(): void {
    if (this.expenseForm.invalid || !this.selectedGroup) {
      this.snack.open('Please fill in all required fields.', 'Close', { duration: 3000 });
      return;
    }
    if (!this.validateSplits()) {
      this.snack.open(this.splitError, 'Close', { duration: 3500 });
      return;
    }

    const { amount, category, description, expense_date } = this.expenseForm.value;
    const payload: CreateGroupExpensePayload = {
      amount: Number(amount),
      category,
      description: description || undefined,
      expense_date: expense_date || undefined,
    };

    // Build splits array if not equal
    if (this.splitMode === 'custom') {
      payload.splits = this.splitsArray.controls.map(c => ({
        user_id: c.get('user_id')?.value,
        amount_owed: Number(c.get('amount_owed')?.value),
      } as SplitInput));
    } else if (this.splitMode === 'percentage') {
      const total = Number(amount);
      payload.splits = this.splitsArray.controls.map(c => ({
        user_id: c.get('user_id')?.value,
        amount_owed: Number(((c.get('amount_owed')?.value / 100) * total).toFixed(2)),
      } as SplitInput));
    }
    // 'equal' → no splits sent, backend splits equally

    this.savingExpense = true;
    this.cdr.detectChanges();

    this.groupService.addGroupExpense(this.selectedGroup.id, payload).subscribe({
      next: () => {
        this.savingExpense = false;
        this.showAddExpenseForm = false;
        this.resetExpenseForm();
        this.cdr.detectChanges();
        this.snack.open('Expense added!', 'OK', { duration: 2500 });
        this.loadGroups();
        this.loadExpenses();
        this.loadBalances();
      },
      error: err => {
        this.savingExpense = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to add expense.', 'Close', { duration: 3000 });
      },
    });
  }

  settleExpense(expense: GroupExpense): void {
    if (!this.selectedGroup) return;
    this.settlingId = expense.id;
    this.cdr.detectChanges();
    this.groupService.settleExpense(this.selectedGroup.id, expense.id).subscribe({
      next: () => {
        this.settlingId = null;
        this.snack.open('Marked as settled!', 'OK', { duration: 2500 });
        this.loadExpenses();
        this.loadBalances();
      },
      error: err => {
        this.settlingId = null;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to settle expense.', 'Close', { duration: 3000 });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  resetExpenseForm(): void {
    this.expenseForm.reset({
      amount: '',
      category: 'Food & Dining',
      description: '',
      expense_date: new Date().toISOString().slice(0, 10),
      split_mode: 'equal',
    });
    this.splitsArray.clear();
    this.splitMode = 'equal';
    this.splitError = '';
  }

  isMySettled(expense: GroupExpense, myUserId: number): boolean {
    const split = expense.splits?.find(s => s.user_id === myUserId);
    return split?.is_settled ?? false;
  }

  getTotalExpenses(): number {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  getMemberName(m: GroupMemberDetail): string {
    return this.groupService.getMemberFullName(m);
  }

  formatCurrency(amount: number): string {
    return this.groupService.formatAmount(amount);
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Food & Dining': 'restaurant', 'Accommodation': 'hotel',
      'Transport': 'directions_car', 'Activities': 'local_activity',
      'Shopping': 'shopping_bag', 'Health': 'medical_services', 'Other': 'receipt',
    };
    return icons[cat] ?? 'receipt';
  }

  isSplitBalanced(): boolean {
    return Math.abs(this.currentSplitTotal - this.expenseAmount) < 0.01;
  }

  trackByGroupId(_: number, g: Group): number { return g.id; }
  trackByExpenseId(_: number, e: GroupExpense): number { return e.id; }
  trackByBalanceIdx(i: number): number { return i; }
}