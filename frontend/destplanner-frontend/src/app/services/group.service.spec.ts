import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { GroupService, Group, GroupExpense, Balance, GroupMemberDetail } from './group.service';

const MOCK_MEMBER: GroupMemberDetail = {
  user_id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com',
};

const MOCK_GROUP: Group = {
  id: 1, group_name: 'Paris Squad', created_by: 1,
  created_at: '2025-01-01', updated_at: '2025-01-01',
  members: [MOCK_MEMBER],
};

const MOCK_EXPENSE: GroupExpense = {
  id: 10, group_id: 1, paid_by: 1, paid_by_name: 'Alice Smith',
  amount: 90, category: 'Food & Dining', description: 'Dinner',
  expense_date: '2025-06-01', created_at: '2025-06-01',
  splits: [
    { user_id: 1, first_name: 'Alice', last_name: 'Smith', amount_owed: 45, is_settled: false },
    { user_id: 2, first_name: 'Bob',   last_name: 'Jones', amount_owed: 45, is_settled: false },
  ],
};

const MOCK_BALANCE: Balance = {
  from_user_id: 2, from_name: 'Bob Jones',
  to_user_id: 1,   to_name: 'Alice Smith',
  amount: 45,
};

describe('GroupService', () => {
  let service: GroupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GroupService, provideHttpClient(), provideHttpClientTesting()],
    });
    service  = TestBed.inject(GroupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ─────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getGroups ─────────────────────────────────────────────────────────────
  it('getGroups: should GET /groups', () => {
    service.getGroups().subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups') && r.method === 'GET');
    req.flush({ groups: [MOCK_GROUP] });
    expect(req.request.method).toBe('GET');
  });

  it('getGroups: should update groups$ with response', () => {
    let emitted: Group[] = [];
    service.groups$.subscribe(g => emitted = g);
    service.getGroups().subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups') && r.method === 'GET');
    req.flush({ groups: [MOCK_GROUP] });
    expect(emitted.length).toBe(1);
    expect(emitted[0].group_name).toBe('Paris Squad');
  });

  it('getGroups: should set groups$ to empty array on empty response', () => {
    let emitted: Group[] = [MOCK_GROUP];
    service.groups$.subscribe(g => emitted = g);
    service.getGroups().subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups') && r.method === 'GET');
    req.flush({ groups: [] });
    expect(emitted).toEqual([]);
  });

  // ── getGroupById ──────────────────────────────────────────────────────────
  it('getGroupById: should GET /groups/:id', () => {
    const payload = { group: MOCK_GROUP, expenses: [] };
    service.getGroupById(1).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1') && r.method === 'GET');
    req.flush(payload);
    expect(req.request.method).toBe('GET');
  });

  it('getGroupById: should update selectedGroup$', () => {
    const payload = { group: MOCK_GROUP, expenses: [MOCK_EXPENSE] };
    let emitted: any = null;
    service.selectedGroup$.subscribe(g => emitted = g);
    service.getGroupById(1).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1'));
    req.flush(payload);
    expect(emitted?.group?.group_name).toBe('Paris Squad');
  });

  // ── createGroup ───────────────────────────────────────────────────────────
  it('createGroup: should POST to /groups with payload', () => {
    service.createGroup({ group_name: 'New Group' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups') && r.method === 'POST');
    expect(req.request.body).toEqual({ group_name: 'New Group' });
    req.flush({ message: 'Group created successfully', group_id: 5 });
  });

  it('createGroup: should return group_id in response', () => {
    let result: any;
    service.createGroup({ group_name: 'Test' }).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/groups') && r.method === 'POST');
    req.flush({ message: 'Group created successfully', group_id: 42 });
    expect(result.group_id).toBe(42);
  });

  // ── addMember ─────────────────────────────────────────────────────────────
  it('addMember: should POST to /groups/:id/members with user_id', () => {
    service.addMember(1, 2).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/members') && r.method === 'POST');
    expect(req.request.body).toEqual({ user_id: 2 });
    req.flush({ message: 'Member added successfully' });
  });

  // ── removeMember ──────────────────────────────────────────────────────────
  it('removeMember: should DELETE /groups/:id/members/:userId', () => {
    service.removeMember(1, 2).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/members/2') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Member removed successfully' });
  });

  // ── getGroupExpenses ──────────────────────────────────────────────────────
  it('getGroupExpenses: should GET /groups/:id/expenses', () => {
    let result: any;
    service.getGroupExpenses(1).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/expenses') && r.method === 'GET');
    req.flush({ expenses: [MOCK_EXPENSE] });
    expect(result.expenses.length).toBe(1);
    expect(result.expenses[0].amount).toBe(90);
  });

  // ── addGroupExpense ───────────────────────────────────────────────────────
  it('addGroupExpense: should POST to /groups/:id/expenses with payload', () => {
    const payload = { amount: 90, category: 'Food & Dining', description: 'Dinner' };
    service.addGroupExpense(1, payload).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/expenses') && r.method === 'POST');
    expect(req.request.body).toMatchObject({ amount: 90, category: 'Food & Dining' });
    req.flush({ message: 'Expense added successfully', expense_id: 10 });
  });

  it('addGroupExpense: should send custom splits when provided', () => {
    const payload = {
      amount: 90, category: 'Accommodation',
      splits: [{ user_id: 1, amount_owed: 60 }, { user_id: 2, amount_owed: 30 }],
    };
    service.addGroupExpense(1, payload).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/expenses') && r.method === 'POST');
    expect(req.request.body.splits).toHaveLength(2);
    req.flush({ message: 'Expense added successfully', expense_id: 11 });
  });

  it('addGroupExpense: should return expense_id in response', () => {
    let result: any;
    service.addGroupExpense(1, { amount: 50, category: 'Transport' }).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/expenses') && r.method === 'POST');
    req.flush({ message: 'ok', expense_id: 99 });
    expect(result.expense_id).toBe(99);
  });

  // ── getGroupBalances ──────────────────────────────────────────────────────
  it('getGroupBalances: should GET /groups/:id/balances', () => {
    service.getGroupBalances(1).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/balances') && r.method === 'GET');
    req.flush({ balances: [MOCK_BALANCE] });
    expect(req.request.method).toBe('GET');
  });

  it('getGroupBalances: should update balances$', () => {
    let emitted: Balance[] = [];
    service.balances$.subscribe(b => emitted = b);
    service.getGroupBalances(1).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/balances'));
    req.flush({ balances: [MOCK_BALANCE] });
    expect(emitted.length).toBe(1);
    expect(emitted[0].from_name).toBe('Bob Jones');
  });

  it('getGroupBalances: should set balances$ to empty on no balances', () => {
    let emitted: Balance[] = [MOCK_BALANCE];
    service.balances$.subscribe(b => emitted = b);
    service.getGroupBalances(1).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/balances'));
    req.flush({ balances: [] });
    expect(emitted).toEqual([]);
  });

  // ── settleExpense ─────────────────────────────────────────────────────────
  it('settleExpense: should PUT to /groups/:id/expenses/:expenseId/settle', () => {
    service.settleExpense(1, 10).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('/groups/1/expenses/10/settle') && r.method === 'PUT'
    );
    expect(req.request.body).toEqual({});
    req.flush({ message: 'Expense settled successfully' });
  });

  it('settleExpense: should return success message', () => {
    let result: any;
    service.settleExpense(1, 10).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/groups/1/expenses/10/settle'));
    req.flush({ message: 'Expense settled successfully' });
    expect(result.message).toBe('Expense settled successfully');
  });

  // ── getMemberFullName ─────────────────────────────────────────────────────
  it('getMemberFullName: should return first + last name', () => {
    expect(service.getMemberFullName(MOCK_MEMBER)).toBe('Alice Smith');
  });

  // ── formatAmount ──────────────────────────────────────────────────────────
  it('formatAmount: should format as USD currency', () => {
    expect(service.formatAmount(45)).toContain('45');
    expect(service.formatAmount(45)).toContain('$');
  });

  it('formatAmount: should format with two decimal places', () => {
    expect(service.formatAmount(45.5)).toContain('45.50');
  });

  // ── setSelectedGroup ──────────────────────────────────────────────────────
  it('setSelectedGroup: should update selectedGroup$', () => {
    let emitted: any = undefined;
    service.selectedGroup$.subscribe(g => emitted = g);
    service.setSelectedGroup({ group: MOCK_GROUP, expenses: [] });
    expect(emitted?.group?.group_name).toBe('Paris Squad');
  });

  it('setSelectedGroup: should allow setting null', () => {
    service.setSelectedGroup({ group: MOCK_GROUP, expenses: [] });
    let emitted: any = 'not-null';
    service.selectedGroup$.subscribe(g => emitted = g);
    service.setSelectedGroup(null);
    expect(emitted).toBeNull();
  });
});