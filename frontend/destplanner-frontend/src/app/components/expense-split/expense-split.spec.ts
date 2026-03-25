import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ExpenseSplitComponent } from './expense-split';
import {
  GroupService, Group, GroupExpense, Balance, GroupMemberDetail,
} from '../../services/group.service';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MEMBER_ALICE: GroupMemberDetail = {
  user_id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com',
};
const MEMBER_BOB: GroupMemberDetail = {
  user_id: 2, first_name: 'Bob', last_name: 'Jones', email: 'bob@test.com',
};

const MOCK_GROUP: Group = {
  id: 1, group_name: 'Paris Squad', created_by: 1,
  created_at: '2025-01-01', updated_at: '2025-01-01',
  members: [MEMBER_ALICE, MEMBER_BOB],
};

const MOCK_EXPENSE: GroupExpense = {
  id: 10, group_id: 1, paid_by: 1, paid_by_name: 'Alice Smith',
  amount: 90, category: 'Food & Dining', description: 'Dinner',
  expense_date: '2025-06-01', created_at: '2025-06-01',
  splits: [
    { user_id: 1, first_name: 'Alice', last_name: 'Smith', amount_owed: 45, is_settled: false },
    { user_id: 2, first_name: 'Bob',   last_name: 'Jones', amount_owed: 45, is_settled: true  },
  ],
};

const MOCK_BALANCE: Balance = {
  from_user_id: 2, from_name: 'Bob Jones',
  to_user_id: 1,   to_name: 'Alice Smith',
  amount: 45,
};

// ── Setup ─────────────────────────────────────────────────────────────────────

function setup(serviceOverrides: Partial<Record<string, any>> = {}) {
  const groupSpy = {
    getGroups:        vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
    getGroupById:     vi.fn().mockReturnValue(of({ group: MOCK_GROUP, expenses: [MOCK_EXPENSE] })),
    createGroup:      vi.fn().mockReturnValue(of({ message: 'created', group_id: 1 })),
    addMember:        vi.fn().mockReturnValue(of({ message: 'added' })),
    removeMember:     vi.fn().mockReturnValue(of({ message: 'removed' })),
    getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [MOCK_EXPENSE] })),
    addGroupExpense:  vi.fn().mockReturnValue(of({ message: 'added', expense_id: 10 })),
    getGroupBalances: vi.fn().mockReturnValue(of({ balances: [MOCK_BALANCE] })),
    settleExpense:    vi.fn().mockReturnValue(of({ message: 'settled' })),
    getMemberFullName: vi.fn((m: GroupMemberDetail) => `${m.first_name} ${m.last_name}`),
    formatAmount:     vi.fn((n: number) => `$${n.toFixed(2)}`),
    setSelectedGroup: vi.fn(),
    groups$:          of([MOCK_GROUP]),
    selectedGroup$:   of(null),
    balances$:        of([]),
    ...serviceOverrides,
  };

  const routerSpy = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [ExpenseSplitComponent, NoopAnimationsModule],
    providers: [
      { provide: GroupService,   useValue: groupSpy },
      { provide: Router,         useValue: routerSpy },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      { provide: PLATFORM_ID,    useValue: 'browser' },
    ],
  });

  const fixture   = TestBed.createComponent(ExpenseSplitComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  const snack    = fixture.debugElement.injector.get(MatSnackBar);
  const snackSpy = vi.spyOn(snack, 'open');

  return { fixture, component, groupSpy, routerSpy, snackSpy };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExpenseSplitComponent', () => {

  beforeEach(() => TestBed.resetTestingModule());

  // ── ngOnInit ─────────────────────────────────────────────────────────────

  it('ngOnInit: should call loadGroups on browser platform', () => {
    const { groupSpy } = setup();
    expect(groupSpy.getGroups).toHaveBeenCalled();
  });

  it('ngOnInit: should populate groups after init', () => {
    const { component } = setup();
    expect(component.groups.length).toBe(1);
    expect(component.groups[0].group_name).toBe('Paris Squad');
  });

  it('ngOnInit: should NOT load groups on server platform', () => {
    const groupSpy = { getGroups: vi.fn().mockReturnValue(of({ groups: [] })), getGroupExpenses: vi.fn(), getGroupBalances: vi.fn(), createGroup: vi.fn(), addGroupExpense: vi.fn(), settleExpense: vi.fn(), getMemberFullName: vi.fn(), formatAmount: vi.fn(), setSelectedGroup: vi.fn(), groups$: of([]), selectedGroup$: of(null), balances$: of([]) };
    TestBed.configureTestingModule({
      imports: [ExpenseSplitComponent, NoopAnimationsModule],
      providers: [
        { provide: GroupService,   useValue: groupSpy },
        { provide: Router,         useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: PLATFORM_ID,    useValue: 'server' },
      ],
    });
    const fixture = TestBed.createComponent(ExpenseSplitComponent);
    fixture.detectChanges();
    expect(groupSpy.getGroups).not.toHaveBeenCalled();
  });

  // ── loadGroups ────────────────────────────────────────────────────────────

  it('loadGroups: should set groups on success', () => {
    const { component } = setup();
    expect(component.groups).toEqual([MOCK_GROUP]);
  });

  it('loadGroups: should set loadingGroups to false after success', () => {
    const { component } = setup();
    expect(component.loadingGroups).toBe(false);
  });

  it('loadGroups: should show snack and navigate on 401', () => {
    const getGroups = vi.fn().mockReturnValue(throwError(() => ({ status: 401 })));
    const routerSpy = { navigate: vi.fn() };
    const groupSpy = {
      getGroups,
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      createGroup: vi.fn(), addGroupExpense: vi.fn(), settleExpense: vi.fn(),
      getMemberFullName: vi.fn(), formatAmount: vi.fn(), setSelectedGroup: vi.fn(),
      groups$: of([]), selectedGroup$: of(null), balances$: of([]),
    };
    TestBed.configureTestingModule({
      imports: [ExpenseSplitComponent, NoopAnimationsModule],
      providers: [
        { provide: GroupService, useValue: groupSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    const fixture = TestBed.createComponent(ExpenseSplitComponent);
    const snack = fixture.debugElement.injector.get(MatSnackBar);
    const snackSpy = vi.spyOn(snack, 'open');
    fixture.detectChanges();
    expect(snackSpy).toHaveBeenCalledWith('Session expired. Please log in.', 'Close', { duration: 3000 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('loadGroups: should show generic snack on other errors', () => {
    const getGroups = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    const groupSpy = {
      getGroups,
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      createGroup: vi.fn(), addGroupExpense: vi.fn(), settleExpense: vi.fn(),
      getMemberFullName: vi.fn(), formatAmount: vi.fn(), setSelectedGroup: vi.fn(),
      groups$: of([]), selectedGroup$: of(null), balances$: of([]),
    };
    TestBed.configureTestingModule({
      imports: [ExpenseSplitComponent, NoopAnimationsModule],
      providers: [
        { provide: GroupService, useValue: groupSpy },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    const fixture = TestBed.createComponent(ExpenseSplitComponent);
    const snack = fixture.debugElement.injector.get(MatSnackBar);
    const snackSpy = vi.spyOn(snack, 'open');
    fixture.detectChanges();
    expect(snackSpy).toHaveBeenCalledWith('Failed to load groups.', 'Close', { duration: 3000 });
  });

  it('loadGroups: should set loadingGroups to false on error', () => {
    const { component } = setup({
      getGroups: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
    });
    expect(component.loadingGroups).toBe(false);
  });

  // ── selectGroup ───────────────────────────────────────────────────────────

  it('selectGroup: should set selectedGroup', () => {
    const { component } = setup();
    component.selectGroup(MOCK_GROUP);
    expect(component.selectedGroup).toEqual(MOCK_GROUP);
  });

  it('selectGroup: should call loadExpenses and loadBalances', () => {
    const { component, groupSpy } = setup();
    component.selectGroup(MOCK_GROUP);
    expect(groupSpy.getGroupExpenses).toHaveBeenCalledWith(1);
    expect(groupSpy.getGroupBalances).toHaveBeenCalledWith(1);
  });

  it('selectGroup: should hide add expense form', () => {
    const { component } = setup();
    component.showAddExpenseForm = true;
    component.selectGroup(MOCK_GROUP);
    expect(component.showAddExpenseForm).toBe(false);
  });

  // ── backToGroups ──────────────────────────────────────────────────────────

  it('backToGroups: should clear selectedGroup', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.backToGroups();
    expect(component.selectedGroup).toBeNull();
  });

  it('backToGroups: should clear expenses and balances', () => {
    const { component } = setup();
    component.expenses = [MOCK_EXPENSE];
    component.balances = [MOCK_BALANCE];
    component.backToGroups();
    expect(component.expenses).toEqual([]);
    expect(component.balances).toEqual([]);
  });

  it('backToGroups: should reload groups', () => {
    const { component, groupSpy } = setup();
    component.backToGroups();
    expect(groupSpy.getGroups).toHaveBeenCalledTimes(2); // init + backToGroups
  });

  // ── toggleCreateGroupForm ─────────────────────────────────────────────────

  it('toggleCreateGroupForm: should show form when hidden', () => {
    const { component } = setup();
    component.showCreateGroupForm = false;
    component.toggleCreateGroupForm();
    expect(component.showCreateGroupForm).toBe(true);
  });

  it('toggleCreateGroupForm: should hide and reset when shown', () => {
    const { component } = setup();
    component.showCreateGroupForm = true;
    component.createGroupForm.patchValue({ group_name: 'Test' });
    component.toggleCreateGroupForm();
    expect(component.showCreateGroupForm).toBe(false);
    expect(component.createGroupForm.get('group_name')?.value).toBeFalsy();
  });

  // ── submitCreateGroup ─────────────────────────────────────────────────────

  it('submitCreateGroup: should call createGroup with group_name', () => {
    const { component, groupSpy } = setup();
    component.createGroupForm.patchValue({ group_name: 'Paris Squad' });
    component.submitCreateGroup();
    expect(groupSpy.createGroup).toHaveBeenCalledWith({ group_name: 'Paris Squad' });
  });

  it('submitCreateGroup: should show snack and reload on success', () => {
    const { component, snackSpy, groupSpy } = setup();
    component.createGroupForm.patchValue({ group_name: 'Paris Squad' });
    component.submitCreateGroup();
    expect(snackSpy).toHaveBeenCalledWith('Group created!', 'OK', { duration: 2500 });
    expect(groupSpy.getGroups).toHaveBeenCalledTimes(2);
  });

  it('submitCreateGroup: should show validation snack when form is invalid', () => {
    const { component, snackSpy } = setup();
    component.createGroupForm.reset();
    component.submitCreateGroup();
    expect(snackSpy).toHaveBeenCalledWith('Group name is required.', 'Close', { duration: 3000 });
  });

  it('submitCreateGroup: should NOT call service when form is invalid', () => {
    const { component, groupSpy } = setup();
    component.createGroupForm.reset();
    component.submitCreateGroup();
    expect(groupSpy.createGroup).not.toHaveBeenCalled();
  });

  it('submitCreateGroup: should show error snack on API failure', () => {
    const { component, snackSpy } = setup({
      getGroups:   vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      createGroup: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Server error' } }))),
    });
    component.createGroupForm.patchValue({ group_name: 'Test' });
    component.submitCreateGroup();
    expect(snackSpy).toHaveBeenCalledWith('Server error', 'Close', { duration: 3000 });
  });

  it('submitCreateGroup: should reset savingGroup on error', () => {
    const { component } = setup({
      getGroups:   vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      createGroup: vi.fn().mockReturnValue(throwError(() => ({}))),
    });
    component.createGroupForm.patchValue({ group_name: 'Test' });
    component.submitCreateGroup();
    expect(component.savingGroup).toBe(false);
  });

  // ── loadExpenses ──────────────────────────────────────────────────────────

  it('loadExpenses: should populate expenses on success', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.loadExpenses();
    expect(component.expenses).toEqual([MOCK_EXPENSE]);
  });

  it('loadExpenses: should set loadingExpenses to false on success', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.loadExpenses();
    expect(component.loadingExpenses).toBe(false);
  });

  it('loadExpenses: should show snack on error', () => {
    const { component, snackSpy } = setup({
      getGroups:        vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      getGroupExpenses: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    component.selectedGroup = MOCK_GROUP;
    component.loadExpenses();
    expect(snackSpy).toHaveBeenCalledWith('Failed to load expenses.', 'Close', { duration: 3000 });
  });

  it('loadExpenses: should do nothing when no selectedGroup', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = null;
    component.loadExpenses();
    expect(groupSpy.getGroupExpenses).not.toHaveBeenCalled();
  });

  // ── loadBalances ──────────────────────────────────────────────────────────

  it('loadBalances: should populate balances on success', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.loadBalances();
    expect(component.balances).toEqual([MOCK_BALANCE]);
  });

  it('loadBalances: should set loadingBalances to false on success', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.loadBalances();
    expect(component.loadingBalances).toBe(false);
  });

  it('loadBalances: should do nothing when no selectedGroup', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = null;
    component.loadBalances();
    expect(groupSpy.getGroupBalances).not.toHaveBeenCalled();
  });

  // ── toggleAddExpenseForm ──────────────────────────────────────────────────

  it('toggleAddExpenseForm: should show form', () => {
    const { component } = setup();
    component.showAddExpenseForm = false;
    component.selectedGroup = MOCK_GROUP;
    component.toggleAddExpenseForm();
    expect(component.showAddExpenseForm).toBe(true);
  });

  it('toggleAddExpenseForm: should hide and reset form', () => {
    const { component } = setup();
    component.showAddExpenseForm = true;
    component.expenseForm.patchValue({ amount: 100 });
    component.toggleAddExpenseForm();
    expect(component.showAddExpenseForm).toBe(false);
    expect(component.expenseForm.get('amount')?.value).toBeFalsy();
  });

  // ── onSplitModeChange ─────────────────────────────────────────────────────

  it('onSplitModeChange: should set splitMode to equal', () => {
    const { component } = setup();
    component.onSplitModeChange('equal');
    expect(component.splitMode).toBe('equal');
  });

  it('onSplitModeChange: should build splits array for custom mode', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.onSplitModeChange('custom');
    expect(component.splitsArray.length).toBe(2); // 2 members
  });

  it('onSplitModeChange: should build splits array for percentage mode', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.onSplitModeChange('percentage');
    expect(component.splitsArray.length).toBe(2);
  });

  it('onSplitModeChange: should clear splits array when switching to equal', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.onSplitModeChange('custom');
    component.onSplitModeChange('equal');
    expect(component.splitsArray.length).toBe(0);
  });

  it('onSplitModeChange: should clear splitError', () => {
    const { component } = setup();
    component.splitError = 'Some previous error';
    component.onSplitModeChange('equal');
    expect(component.splitError).toBe('');
  });

  // ── validateSplits ────────────────────────────────────────────────────────

  it('validateSplits: should return true for equal mode', () => {
    const { component } = setup();
    component.splitMode = 'equal';
    expect(component.validateSplits()).toBe(true);
  });

  it('validateSplits: should return false when custom amounts do not match total', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 40 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 40 }); // total 80, not 90
    expect(component.validateSplits()).toBe(false);
    expect(component.splitError).toContain('$90.00');
  });

  it('validateSplits: should return true when custom amounts match total', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 45 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 45 });
    expect(component.validateSplits()).toBe(true);
  });

  it('validateSplits: should return false when percentages do not add to 100', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('percentage');
    component.splitsArray.controls[0].patchValue({ amount_owed: 60 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 30 }); // 90%, not 100%
    expect(component.validateSplits()).toBe(false);
    expect(component.splitError).toContain('100%');
  });

  it('validateSplits: should return true when percentages sum to 100', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('percentage');
    component.splitsArray.controls[0].patchValue({ amount_owed: 60 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 40 });
    expect(component.validateSplits()).toBe(true);
  });

  // ── submitAddExpense ──────────────────────────────────────────────────────

  it('submitAddExpense: should call addGroupExpense with correct payload (equal split)', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.splitMode = 'equal';
    component.expenseForm.patchValue({ amount: 90, category: 'Food & Dining', description: 'Dinner' });
    component.submitAddExpense();
    expect(groupSpy.addGroupExpense).toHaveBeenCalledWith(1, expect.objectContaining({
      amount: 90, category: 'Food & Dining', description: 'Dinner',
    }));
  });

  it('submitAddExpense: should NOT send splits for equal mode', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.splitMode = 'equal';
    component.expenseForm.patchValue({ amount: 90, category: 'Transport' });
    component.submitAddExpense();
    const call = groupSpy.addGroupExpense.mock.calls[0][1];
    expect(call.splits).toBeUndefined();
  });

  it('submitAddExpense: should send custom splits for custom mode', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90, category: 'Accommodation' });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 60 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 30 });
    component.submitAddExpense();
    const call = groupSpy.addGroupExpense.mock.calls[0][1];
    expect(call.splits).toHaveLength(2);
    expect(call.splits[0].amount_owed).toBe(60);
  });

  it('submitAddExpense: should convert percentages to amounts for percentage mode', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 100, category: 'Shopping' });
    component.onSplitModeChange('percentage');
    component.splitsArray.controls[0].patchValue({ amount_owed: 60 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 40 });
    component.submitAddExpense();
    const call = groupSpy.addGroupExpense.mock.calls[0][1];
    expect(call.splits[0].amount_owed).toBe(60);
    expect(call.splits[1].amount_owed).toBe(40);
  });

  it('submitAddExpense: should show success snack and reload on success', () => {
    const { component, snackSpy, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90, category: 'Food & Dining' });
    component.submitAddExpense();
    expect(snackSpy).toHaveBeenCalledWith('Expense added!', 'OK', { duration: 2500 });
    expect(groupSpy.getGroupExpenses).toHaveBeenCalledTimes(2); // selectGroup + after add
  });

  it('submitAddExpense: should show validation snack when form is invalid', () => {
    const { component, snackSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.get('amount')?.setValue('');
    component.submitAddExpense();
    expect(snackSpy).toHaveBeenCalledWith('Please fill in all required fields.', 'Close', { duration: 3000 });
  });

  it('submitAddExpense: should show split error snack when splits are invalid', () => {
    const { component, snackSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90, category: 'Food & Dining' });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 10 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 10 }); // doesn't add to 90
    component.submitAddExpense();
    expect(snackSpy).toHaveBeenCalled();
  });

  it('submitAddExpense: should show error snack on API failure', () => {
    const { component, snackSpy } = setup({
      getGroups:       vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      addGroupExpense: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Custom error' } }))),
    });
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90, category: 'Transport' });
    component.submitAddExpense();
    expect(snackSpy).toHaveBeenCalledWith('Custom error', 'Close', { duration: 3000 });
  });

  it('submitAddExpense: should reset savingExpense on error', () => {
    const { component } = setup({
      getGroups:        vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      addGroupExpense:  vi.fn().mockReturnValue(throwError(() => ({}))),
    });
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90, category: 'Transport' });
    component.submitAddExpense();
    expect(component.savingExpense).toBe(false);
  });

  // ── settleExpense ─────────────────────────────────────────────────────────

  it('settleExpense: should call settleExpense service', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.settleExpense(MOCK_EXPENSE);
    expect(groupSpy.settleExpense).toHaveBeenCalledWith(1, 10);
  });

  it('settleExpense: should show success snack and reload', () => {
    const { component, snackSpy, groupSpy } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.settleExpense(MOCK_EXPENSE);
    expect(snackSpy).toHaveBeenCalledWith('Marked as settled!', 'OK', { duration: 2500 });
    expect(groupSpy.getGroupExpenses).toHaveBeenCalled();
    expect(groupSpy.getGroupBalances).toHaveBeenCalled();
  });

  it('settleExpense: should reset settlingId after success', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.settleExpense(MOCK_EXPENSE);
    expect(component.settlingId).toBeNull();
  });

  it('settleExpense: should show error snack on failure', () => {
    const { component, snackSpy } = setup({
      getGroups:        vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      settleExpense:    vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Already settled' } }))),
    });
    component.selectedGroup = MOCK_GROUP;
    component.settleExpense(MOCK_EXPENSE);
    expect(snackSpy).toHaveBeenCalledWith('Already settled', 'Close', { duration: 3000 });
  });

  it('settleExpense: should reset settlingId on error', () => {
    const { component } = setup({
      getGroups:        vi.fn().mockReturnValue(of({ groups: [MOCK_GROUP] })),
      getGroupExpenses: vi.fn().mockReturnValue(of({ expenses: [] })),
      getGroupBalances: vi.fn().mockReturnValue(of({ balances: [] })),
      settleExpense:    vi.fn().mockReturnValue(throwError(() => ({}))),
    });
    component.selectedGroup = MOCK_GROUP;
    component.settleExpense(MOCK_EXPENSE);
    expect(component.settlingId).toBeNull();
  });

  it('settleExpense: should do nothing when no selectedGroup', () => {
    const { component, groupSpy } = setup();
    component.selectedGroup = null;
    component.settleExpense(MOCK_EXPENSE);
    expect(groupSpy.settleExpense).not.toHaveBeenCalled();
  });

  // ── resetExpenseForm ──────────────────────────────────────────────────────

  it('resetExpenseForm: should reset form to defaults', () => {
    const { component } = setup();
    component.expenseForm.patchValue({ amount: 500, description: 'test' });
    component.resetExpenseForm();
    expect(component.expenseForm.get('amount')?.value).toBeFalsy();
    expect(component.expenseForm.get('category')?.value).toBe('Food & Dining');
    expect(component.splitMode).toBe('equal');
    expect(component.splitError).toBe('');
  });

  it('resetExpenseForm: should clear the splits FormArray', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.onSplitModeChange('custom');
    expect(component.splitsArray.length).toBe(2);
    component.resetExpenseForm();
    expect(component.splitsArray.length).toBe(0);
  });

  // ── isMySettled ───────────────────────────────────────────────────────────

  it('isMySettled: should return true when my split is settled', () => {
    const { component } = setup();
    expect(component.isMySettled(MOCK_EXPENSE, 2)).toBe(true); // Bob is settled
  });

  it('isMySettled: should return false when my split is not settled', () => {
    const { component } = setup();
    expect(component.isMySettled(MOCK_EXPENSE, 1)).toBe(false); // Alice is not settled
  });

  it('isMySettled: should return false when user has no split', () => {
    const { component } = setup();
    expect(component.isMySettled(MOCK_EXPENSE, 999)).toBe(false);
  });

  // ── getTotalExpenses ──────────────────────────────────────────────────────

  it('getTotalExpenses: should sum all expense amounts', () => {
    const { component } = setup();
    const e2: GroupExpense = { ...MOCK_EXPENSE, id: 2, amount: 60 };
    component.expenses = [MOCK_EXPENSE, e2];
    expect(component.getTotalExpenses()).toBe(150);
  });

  it('getTotalExpenses: should return 0 when no expenses', () => {
    const { component } = setup();
    component.expenses = [];
    expect(component.getTotalExpenses()).toBe(0);
  });

  // ── getMemberName ─────────────────────────────────────────────────────────

  it('getMemberName: should call groupService.getMemberFullName', () => {
    const { component, groupSpy } = setup();
    component.getMemberName(MEMBER_ALICE);
    expect(groupSpy.getMemberFullName).toHaveBeenCalledWith(MEMBER_ALICE);
  });

  // ── formatCurrency ────────────────────────────────────────────────────────

  it('formatCurrency: should call groupService.formatAmount', () => {
    const { component, groupSpy } = setup();
    component.formatCurrency(45);
    expect(groupSpy.formatAmount).toHaveBeenCalledWith(45);
  });

  // ── getCategoryIcon ───────────────────────────────────────────────────────

  it('getCategoryIcon: should return correct icons for known categories', () => {
    const { component } = setup();
    expect(component.getCategoryIcon('Food & Dining')).toBe('restaurant');
    expect(component.getCategoryIcon('Accommodation')).toBe('hotel');
    expect(component.getCategoryIcon('Transport')).toBe('directions_car');
    expect(component.getCategoryIcon('Activities')).toBe('local_activity');
    expect(component.getCategoryIcon('Shopping')).toBe('shopping_bag');
    expect(component.getCategoryIcon('Health')).toBe('medical_services');
    expect(component.getCategoryIcon('Other')).toBe('receipt');
  });

  it('getCategoryIcon: should return receipt fallback for unknown category', () => {
    const { component } = setup();
    expect(component.getCategoryIcon('Unknown')).toBe('receipt');
  });

  // ── isSplitBalanced ───────────────────────────────────────────────────────

  it('isSplitBalanced: should return true when split total equals expense amount', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 45 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 45 });
    expect(component.isSplitBalanced()).toBe(true);
  });

  it('isSplitBalanced: should return false when split total does not match', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.expenseForm.patchValue({ amount: 90 });
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 30 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 30 });
    expect(component.isSplitBalanced()).toBe(false);
  });

  // ── currentSplitTotal (getter) ────────────────────────────────────────────

  it('currentSplitTotal: should sum amount_owed from all splits controls', () => {
    const { component } = setup();
    component.selectedGroup = MOCK_GROUP;
    component.onSplitModeChange('custom');
    component.splitsArray.controls[0].patchValue({ amount_owed: 30 });
    component.splitsArray.controls[1].patchValue({ amount_owed: 60 });
    expect(component.currentSplitTotal).toBe(90);
  });

  it('currentSplitTotal: should return 0 when no splits', () => {
    const { component } = setup();
    component.onSplitModeChange('equal');
    expect(component.currentSplitTotal).toBe(0);
  });

  // ── expenseAmount (getter) ────────────────────────────────────────────────

  it('expenseAmount: should return parsed number from form', () => {
    const { component } = setup();
    component.expenseForm.patchValue({ amount: '120.50' });
    expect(component.expenseAmount).toBe(120.5);
  });

  it('expenseAmount: should return 0 when amount is empty', () => {
    const { component } = setup();
    component.expenseForm.patchValue({ amount: '' });
    expect(component.expenseAmount).toBe(0);
  });

  // ── trackBy helpers ───────────────────────────────────────────────────────

  it('trackByGroupId: should return group id', () => {
    const { component } = setup();
    expect(component.trackByGroupId(0, MOCK_GROUP)).toBe(1);
  });

  it('trackByExpenseId: should return expense id', () => {
    const { component } = setup();
    expect(component.trackByExpenseId(0, MOCK_EXPENSE)).toBe(10);
  });

  it('trackByBalanceIdx: should return index', () => {
    const { component } = setup();
    expect(component.trackByBalanceIdx(3)).toBe(3);
  });
});