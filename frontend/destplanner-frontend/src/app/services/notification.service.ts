import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { tap, switchMap, startWith } from 'rxjs/operators';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  trip_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  trip_reminders: boolean;
  itinerary_changes: boolean;
  expense_updates: boolean;
  collaborator_updates: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = 'http://localhost:8080/api';

  private _notifications$ = new BehaviorSubject<Notification[]>([]);
  private _unreadCount$ = new BehaviorSubject<number>(0);
  private _preferences$ = new BehaviorSubject<NotificationPreferences | null>(null);

  readonly notifications$ = this._notifications$.asObservable();
  readonly unreadCount$ = this._unreadCount$.asObservable();
  readonly preferences$ = this._preferences$.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private http: HttpClient) {}

  /** Load full notification list */
  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    const url = unreadOnly
      ? `${this.baseUrl}/notifications?unread_only=true`
      : `${this.baseUrl}/notifications`;
    return this.http.get<NotificationsResponse>(url).pipe(
      tap(res => {
        this._notifications$.next(res.notifications ?? []);
        this._unreadCount$.next(res.unread_count ?? 0);
      })
    );
  }

  /** Lightweight poll for badge count */
  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http
      .get<{ unread_count: number }>(`${this.baseUrl}/notifications/unread-count`)
      .pipe(tap(res => this._unreadCount$.next(res.unread_count)));
  }

  markRead(id: number): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/notifications/${id}/read`, {})
      .pipe(tap(() => this._markLocalRead(id)));
  }

  markAllRead(): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/notifications/read-all`, {})
      .pipe(
        tap(() => {
          const updated = this._notifications$.getValue().map(n => ({ ...n, is_read: true }));
          this._notifications$.next(updated);
          this._unreadCount$.next(0);
        })
      );
  }

  deleteNotification(id: number): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/notifications/${id}`)
      .pipe(
        tap(() => {
          const filtered = this._notifications$.getValue().filter(n => n.id !== id);
          this._notifications$.next(filtered);
          const unread = filtered.filter(n => !n.is_read).length;
          this._unreadCount$.next(unread);
        })
      );
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http
      .get<NotificationPreferences>(`${this.baseUrl}/notifications/preferences`)
      .pipe(tap(prefs => this._preferences$.next(prefs)));
  }

  updatePreferences(prefs: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.http
      .put<NotificationPreferences>(`${this.baseUrl}/notifications/preferences`, prefs)
      .pipe(tap(updated => this._preferences$.next(updated)));
  }

  /** Start polling unread count every 30s */
  startPolling(intervalMs = 30000): void {
    if (this.pollSub) return;
    this.pollSub = interval(intervalMs)
      .pipe(startWith(0), switchMap(() => this.getUnreadCount()))
      .subscribe();
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private _markLocalRead(id: number): void {
    const updated = this._notifications$.getValue().map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    this._notifications$.next(updated);
    const unread = updated.filter(n => !n.is_read).length;
    this._unreadCount$.next(unread);
  }
}
