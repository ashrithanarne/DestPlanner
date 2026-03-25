import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface GroupMemberDetail {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface SplitDetail {
  user_id: number;
  first_name: string;
  last_name: string;
  amount_owed: number;
  is_settled: boolean;
}

export interface GroupExpense {
  id: number;
  group_id: number;
  paid_by: number;
  paid_by_name: string;
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  created_at: string;
  splits: SplitDetail[];
}

export interface Balance {
  from_user_id: number;
  from_name: string;
  to_user_id: number;
  to_name: string;
  amount: number;
}

export interface Group {
  id: number;
  group_name: string;
  created_by: number;
  created_by_name?: string;
  trip_id?: number;
  created_at: string;
  updated_at: string;
  members: GroupMemberDetail[];
}

export interface GroupWithExpenses {
  group: Group;
  expenses: GroupExpense[];
}

export interface SplitInput {
  user_id: number;
  amount_owed: number;
}

export interface CreateGroupPayload {
  group_name: string;
  trip_id?: number;
}

export interface CreateGroupExpensePayload {
  amount: number;
  category: string;
  description?: string;
  expense_date?: string;
  splits?: SplitInput[];
}

export interface UserSearchResult {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Accommodation', 'Transport',
  'Activities', 'Shopping', 'Health', 'Other',
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GroupService {
  private baseUrl = environment.apiUrl;

  private groupsSubject = new BehaviorSubject<Group[]>([]);
  groups$ = this.groupsSubject.asObservable();

  private selectedGroupSubject = new BehaviorSubject<GroupWithExpenses | null>(null);
  selectedGroup$ = this.selectedGroupSubject.asObservable();

  private balancesSubject = new BehaviorSubject<Balance[]>([]);
  balances$ = this.balancesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // GET /api/groups
  getGroups(): Observable<{ groups: Group[] }> {
    return this.http.get<{ groups: Group[] }>(`${this.baseUrl}/groups`).pipe(
      tap(res => this.groupsSubject.next(res.groups ?? []))
    );
  }

  // GET /api/groups/:id
  getGroupById(id: number): Observable<GroupWithExpenses> {
    return this.http.get<GroupWithExpenses>(`${this.baseUrl}/groups/${id}`).pipe(
      tap(res => this.selectedGroupSubject.next(res))
    );
  }

  // POST /api/groups
  createGroup(payload: CreateGroupPayload): Observable<{ message: string; group_id: number }> {
    return this.http.post<{ message: string; group_id: number }>(
      `${this.baseUrl}/groups`, payload
    );
  }

  // POST /api/groups/:id/members
  addMember(groupId: number, userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/groups/${groupId}/members`, { user_id: userId }
    );
  }

  // DELETE /api/groups/:id/members/:userId
  removeMember(groupId: number, userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/groups/${groupId}/members/${userId}`
    );
  }

  // GET /api/groups/:id/expenses
  getGroupExpenses(groupId: number): Observable<{ expenses: GroupExpense[] }> {
    return this.http.get<{ expenses: GroupExpense[] }>(
      `${this.baseUrl}/groups/${groupId}/expenses`
    );
  }

  // POST /api/groups/:id/expenses
  addGroupExpense(
    groupId: number,
    payload: CreateGroupExpensePayload
  ): Observable<{ message: string; expense_id: number }> {
    return this.http.post<{ message: string; expense_id: number }>(
      `${this.baseUrl}/groups/${groupId}/expenses`, payload
    );
  }

  // GET /api/groups/:id/balances
  getGroupBalances(groupId: number): Observable<{ balances: Balance[] }> {
    return this.http.get<{ balances: Balance[] }>(
      `${this.baseUrl}/groups/${groupId}/balances`
    ).pipe(
      tap(res => this.balancesSubject.next(res.balances ?? []))
    );
  }

  // PUT /api/groups/:id/expenses/:expenseId/settle
  settleExpense(groupId: number, expenseId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/groups/${groupId}/expenses/${expenseId}/settle`, {}
    );
  }

  // GET /api/users/search?q=...
  searchUsers(query: string): Observable<{ users: UserSearchResult[] }> {
    return this.http.get<{ users: UserSearchResult[] }>(
      `${this.baseUrl}/users/search`, { params: { q: query } }
    );
  }

  // Helpers
  getMemberFullName(m: GroupMemberDetail): string {
    return `${m.first_name} ${m.last_name}`;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  setSelectedGroup(g: GroupWithExpenses | null): void {
    this.selectedGroupSubject.next(g);
  }
}