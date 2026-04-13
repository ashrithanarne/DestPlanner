import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { NotificationsComponent } from './notifications.component';
import {
  NotificationService,
  Notification,
  NotificationPreferences,
} from '../../services/notification.service';

// ── Helpers ───────────────────────────────────────────────────────────────

const makeNotif = (o: Partial<Notification> = {}): Notification => ({
  id: 1,
  user_id: 1,
  type: 'trip_updated',
  title: 'Trip Updated',
  message: 'Your trip was updated.',
  trip_id: null,
  is_read: false,
  created_at: '2026-04-01T10:00:00Z',
  ...o,
});

const defaultPrefs: NotificationPreferences = {
  email_enabled: false,
  trip_reminders: true,
  itinerary_changes: true,
  expense_updates: true,
  collaborator_updates: true,
};

// ── Shared setup helper ───────────────────────────────────────────────────

function buildComponent(platformId = 'browser', serviceOverrides: any = {}) {
  const notifServiceMock = {
    notifications$: new BehaviorSubject<Notification[]>([]).asObservable(),
    unreadCount$: new BehaviorSubject<number>(0).asObservable(),
    preferences$: new BehaviorSubject<NotificationPreferences | null>(null).asObservable(),
    getNotifications: vi.fn(() => of({ notifications: [], unread_count: 0, total: 0 })),
    getPreferences: vi.fn(() => of(defaultPrefs)),
    markRead: vi.fn(() => of({})),
    markAllRead: vi.fn(() => of({})),
    deleteNotification: vi.fn(() => of({})),
    updatePreferences: vi.fn(() => of(defaultPrefs)),
    ...serviceOverrides,
  };

  TestBed.configureTestingModule({
    imports: [NotificationsComponent, ReactiveFormsModule, NoopAnimationsModule],
    providers: [
      { provide: NotificationService, useValue: notifServiceMock },
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });

  const fixture = TestBed.createComponent(NotificationsComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  const snackBar = fixture.debugElement.injector.get(MatSnackBar);
  const snack = { open: vi.spyOn(snackBar, 'open') };

  return { component, fixture, notifService: notifServiceMock, snack };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('NotificationsComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── Creation ──────────────────────────────────────────────────────

  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ──────────────────────────────────────────────────────

  it('ngOnInit: should call getNotifications on init (browser)', () => {
    const { notifService } = buildComponent();
    expect(notifService.getNotifications).toHaveBeenCalledWith(false);
  });

  it('ngOnInit: should call getPreferences on init (browser)', () => {
    const { notifService } = buildComponent();
    expect(notifService.getPreferences).toHaveBeenCalled();
  });

  it('ngOnInit: should NOT load on server platform', () => {
    const { notifService } = buildComponent('server');
    expect(notifService.getNotifications).not.toHaveBeenCalled();
    expect(notifService.getPreferences).not.toHaveBeenCalled();
  });

  it('ngOnInit: should initialise prefsForm with default values', () => {
    const { component } = buildComponent();
    expect(component.prefsForm.get('email_enabled')?.value).toBe(false);
    expect(component.prefsForm.get('trip_reminders')?.value).toBe(true);
  });

  it('ngOnInit: should patch prefsForm with loaded preferences', () => {
    const prefs: NotificationPreferences = { ...defaultPrefs, email_enabled: true };
    const { component } = buildComponent('browser', {
      getPreferences: vi.fn(() => of(prefs)),
    });
    expect(component.prefsForm.get('email_enabled')?.value).toBe(true);
  });

  // ── loadNotifications ─────────────────────────────────────────────

  it('loadNotifications: should set loading to false after success', () => {
    const { component } = buildComponent();
    component.loadNotifications();
    expect(component.loading).toBe(false);
  });

  it('loadNotifications: should show snack on non-401 server error', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.getNotifications.mockReturnValue(throwError(() => ({ status: 500 })));
    component.loadNotifications();
    expect(snack.open).toHaveBeenCalledWith(
      'Failed to load notifications', 'Close', { duration: 3000 }
    );
  });

  it('loadNotifications: should NOT show snack on 401 error', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.getNotifications.mockReturnValue(throwError(() => ({ status: 401 })));
    snack.open.mockClear();
    component.loadNotifications();
    expect(snack.open).not.toHaveBeenCalled();
  });

  it('loadNotifications: should set loading to false even on error', () => {
    const { component, notifService } = buildComponent();
    notifService.getNotifications.mockReturnValue(throwError(() => ({ status: 500 })));
    component.loadNotifications();
    expect(component.loading).toBe(false);
  });

  // ── toggleUnreadFilter ────────────────────────────────────────────

  it('toggleUnreadFilter: should flip showUnreadOnly from false to true', () => {
    const { component } = buildComponent();
    expect(component.showUnreadOnly).toBe(false);
    component.toggleUnreadFilter();
    expect(component.showUnreadOnly).toBe(true);
  });

  it('toggleUnreadFilter: should flip showUnreadOnly back to false', () => {
    const { component } = buildComponent();
    component.showUnreadOnly = true;
    component.toggleUnreadFilter();
    expect(component.showUnreadOnly).toBe(false);
  });

  it('toggleUnreadFilter: should re-call getNotifications with new flag (true)', () => {
    const { component, notifService } = buildComponent();
    notifService.getNotifications.mockClear();
    component.toggleUnreadFilter();
    expect(notifService.getNotifications).toHaveBeenCalledWith(true);
  });

  it('toggleUnreadFilter: should re-call getNotifications with false after second toggle', () => {
    const { component, notifService } = buildComponent();
    component.showUnreadOnly = true;
    notifService.getNotifications.mockClear();
    component.toggleUnreadFilter();
    expect(notifService.getNotifications).toHaveBeenCalledWith(false);
  });

  // ── markRead ──────────────────────────────────────────────────────

  it('markRead: should NOT call service for already-read notification', () => {
    const { component, notifService } = buildComponent();
    notifService.markRead.mockClear();
    component.markRead(makeNotif({ is_read: true }));
    expect(notifService.markRead).not.toHaveBeenCalled();
  });

  it('markRead: should call markRead with notification id for unread notification', () => {
    const { component, notifService } = buildComponent();
    component.markRead(makeNotif({ id: 3, is_read: false }));
    expect(notifService.markRead).toHaveBeenCalledWith(3);
  });

  it('markRead: should show error snack when service errors', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.markRead.mockReturnValue(throwError(() => ({})));
    component.markRead(makeNotif({ id: 1, is_read: false }));
    expect(snack.open).toHaveBeenCalledWith('Failed to mark as read', 'Close', { duration: 2000 });
  });

  // ── markAllRead ───────────────────────────────────────────────────

  it('markAllRead: should call markAllRead on service', () => {
    const { component, notifService } = buildComponent();
    component.markAllRead();
    expect(notifService.markAllRead).toHaveBeenCalled();
  });

  it('markAllRead: should show success snack on success', () => {
    const { component, snack } = buildComponent();
    component.markAllRead();
    expect(snack.open).toHaveBeenCalledWith(
      'All notifications marked as read', 'Close', { duration: 2000 }
    );
  });

  it('markAllRead: should show error snack on failure', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.markAllRead.mockReturnValue(throwError(() => ({})));
    component.markAllRead();
    expect(snack.open).toHaveBeenCalledWith(
      'Failed to mark all as read', 'Close', { duration: 2000 }
    );
  });

  // ── deleteNotification ────────────────────────────────────────────

  it('deleteNotification: should call deleteNotification with correct id', () => {
    const { component, notifService } = buildComponent();
    component.deleteNotification(5);
    expect(notifService.deleteNotification).toHaveBeenCalledWith(5);
  });

  it('deleteNotification: should reset deletingId to null after success', () => {
    const { component } = buildComponent();
    component.deleteNotification(5);
    expect(component.deletingId).toBeNull();
  });

  it('deleteNotification: should show success snack on success', () => {
    const { component, snack } = buildComponent();
    component.deleteNotification(5);
    expect(snack.open).toHaveBeenCalledWith('Notification deleted', 'Close', { duration: 2000 });
  });

  it('deleteNotification: should show error snack on failure', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.deleteNotification.mockReturnValue(throwError(() => ({})));
    component.deleteNotification(5);
    expect(snack.open).toHaveBeenCalledWith(
      'Failed to delete notification', 'Close', { duration: 2000 }
    );
  });

  it('deleteNotification: should reset deletingId to null on error', () => {
    const { component, notifService } = buildComponent();
    notifService.deleteNotification.mockReturnValue(throwError(() => ({})));
    component.deleteNotification(5);
    expect(component.deletingId).toBeNull();
  });

  // ── savePreferences ───────────────────────────────────────────────

  it('savePreferences: should call updatePreferences with form value', () => {
    const { component, notifService } = buildComponent();
    component.savePreferences();
    expect(notifService.updatePreferences).toHaveBeenCalledWith(component.prefsForm.value);
  });

  it('savePreferences: should close preferences panel on success', () => {
    const { component } = buildComponent();
    component.showPreferences = true;
    component.savePreferences();
    expect(component.showPreferences).toBe(false);
  });

  it('savePreferences: should show success snack on success', () => {
    const { component, snack } = buildComponent();
    component.savePreferences();
    expect(snack.open).toHaveBeenCalledWith('Preferences saved', 'Close', { duration: 2000 });
  });

  it('savePreferences: should show error snack on failure', () => {
    const { component, snack, notifService } = buildComponent();
    notifService.updatePreferences.mockReturnValue(throwError(() => ({})));
    component.savePreferences();
    expect(snack.open).toHaveBeenCalledWith(
      'Failed to save preferences', 'Close', { duration: 2000 }
    );
  });

  it('savePreferences: should NOT close panel on failure', () => {
    const { component, notifService } = buildComponent();
    notifService.updatePreferences.mockReturnValue(throwError(() => ({})));
    component.showPreferences = true;
    component.savePreferences();
    expect(component.showPreferences).toBe(true);
  });

  // ── getTypeIcon ───────────────────────────────────────────────────

  it('getTypeIcon: should return schedule for trip_reminder_7day', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('trip_reminder_7day')).toBe('schedule');
  });

  it('getTypeIcon: should return alarm for trip_reminder_1day', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('trip_reminder_1day')).toBe('alarm');
  });

  it('getTypeIcon: should return edit for trip_updated', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('trip_updated')).toBe('edit');
  });

  it('getTypeIcon: should return event_note for itinerary_changed', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('itinerary_changed')).toBe('event_note');
  });

  it('getTypeIcon: should return person_add for collaborator_added', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('collaborator_added')).toBe('person_add');
  });

  it('getTypeIcon: should return notifications fallback for unknown type', () => {
    const { component } = buildComponent();
    expect(component.getTypeIcon('unknown_type')).toBe('notifications');
  });

  // ── getTypeColor ──────────────────────────────────────────────────

  it('getTypeColor: should return warn for trip_reminder_1day', () => {
    const { component } = buildComponent();
    expect(component.getTypeColor('trip_reminder_1day')).toBe('warn');
  });

  it('getTypeColor: should return accent for trip_reminder_7day', () => {
    const { component } = buildComponent();
    expect(component.getTypeColor('trip_reminder_7day')).toBe('accent');
  });

  it('getTypeColor: should return primary for trip_updated', () => {
    const { component } = buildComponent();
    expect(component.getTypeColor('trip_updated')).toBe('primary');
  });

  it('getTypeColor: should return primary as fallback for unknown type', () => {
    const { component } = buildComponent();
    expect(component.getTypeColor('something_else')).toBe('primary');
  });

  // ── formatDate ────────────────────────────────────────────────────

  it('formatDate: should return a non-empty formatted string', () => {
    const { component } = buildComponent();
    const result = component.formatDate('2026-04-01T10:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formatDate: should include the day of the month', () => {
    const { component } = buildComponent();
    const result = component.formatDate('2026-04-15T10:00:00Z');
    expect(result).toContain('15');
  });

  // ── trackById ─────────────────────────────────────────────────────

  it('trackById: should return the notification id', () => {
    const { component } = buildComponent();
    expect(component.trackById(0, makeNotif({ id: 7 }))).toBe(7);
  });

  it('trackById: should work with different ids', () => {
    const { component } = buildComponent();
    expect(component.trackById(2, makeNotif({ id: 42 }))).toBe(42);
  });
});