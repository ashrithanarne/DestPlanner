import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { NotificationService, Notification, NotificationsResponse, NotificationPreferences } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const BASE = 'http://localhost:8080/api';

  const mockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 1,
    user_id: 1,
    type: 'trip_updated',
    title: 'Trip Updated',
    message: 'Your trip was updated',
    trip_id: 10,
    is_read: false,
    created_at: '2026-04-01T10:00:00Z',
    ...overrides,
  });

  const mockResponse = (notifications: Notification[]): NotificationsResponse => ({
    notifications,
    unread_count: notifications.filter(n => !n.is_read).length,
    total: notifications.length,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getNotifications ──────────────────────────────────────────────────

  it('getNotifications: should GET /notifications', () => {
    service.getNotifications().subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse([]));
  });

  it('getNotifications: should update notifications$ and unreadCount$', () => {
    const n1 = mockNotification({ id: 1, is_read: false });
    const n2 = mockNotification({ id: 2, is_read: true });
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush(mockResponse([n1, n2]));
    service.notifications$.subscribe(ns => expect(ns.length).toBe(2));
    service.unreadCount$.subscribe(c => expect(c).toBe(1));
  });

  it('getNotifications: should GET with unread_only=true when flag set', () => {
    service.getNotifications(true).subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications?unread_only=true`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse([]));
  });

  it('getNotifications: should set empty array when notifications is null', () => {
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush({ notifications: null, unread_count: 0, total: 0 });
    service.notifications$.subscribe(ns => expect(ns).toEqual([]));
  });

  // ── getUnreadCount ────────────────────────────────────────────────────

  it('getUnreadCount: should GET /notifications/unread-count', () => {
    service.getUnreadCount().subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ unread_count: 5 });
  });

  it('getUnreadCount: should update unreadCount$', () => {
    service.getUnreadCount().subscribe();
    httpMock.expectOne(`${BASE}/notifications/unread-count`).flush({ unread_count: 7 });
    service.unreadCount$.subscribe(c => expect(c).toBe(7));
  });

  // ── markRead ──────────────────────────────────────────────────────────

  it('markRead: should PUT /notifications/:id/read', () => {
    service.markRead(3).subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/3/read`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('markRead: should update is_read locally', () => {
    // Seed notifications
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush(mockResponse([mockNotification({ id: 3, is_read: false })]));

    service.markRead(3).subscribe();
    httpMock.expectOne(`${BASE}/notifications/3/read`).flush({});

    service.notifications$.subscribe(ns => {
      const n = ns.find(x => x.id === 3);
      expect(n?.is_read).toBe(true);
    });
  });

  it('markRead: should decrement unreadCount$ after marking read', () => {
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush(mockResponse([mockNotification({ id: 1, is_read: false })]));

    service.markRead(1).subscribe();
    httpMock.expectOne(`${BASE}/notifications/1/read`).flush({});

    service.unreadCount$.subscribe(c => expect(c).toBe(0));
  });

  // ── markAllRead ───────────────────────────────────────────────────────

  it('markAllRead: should PUT /notifications/read-all', () => {
    service.markAllRead().subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/read-all`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('markAllRead: should set all notifications to is_read=true locally', () => {
    const notifs = [
      mockNotification({ id: 1, is_read: false }),
      mockNotification({ id: 2, is_read: false }),
    ];
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush(mockResponse(notifs));

    service.markAllRead().subscribe();
    httpMock.expectOne(`${BASE}/notifications/read-all`).flush({});

    service.notifications$.subscribe(ns => ns.forEach(n => expect(n.is_read).toBe(true)));
    service.unreadCount$.subscribe(c => expect(c).toBe(0));
  });

  // ── deleteNotification ────────────────────────────────────────────────

  it('deleteNotification: should DELETE /notifications/:id', () => {
    service.deleteNotification(5).subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('deleteNotification: should remove notification from local list', () => {
    const notifs = [mockNotification({ id: 5 }), mockNotification({ id: 6 })];
    service.getNotifications().subscribe();
    httpMock.expectOne(`${BASE}/notifications`).flush(mockResponse(notifs));

    service.deleteNotification(5).subscribe();
    httpMock.expectOne(`${BASE}/notifications/5`).flush({});

    service.notifications$.subscribe(ns => {
      expect(ns.length).toBe(1);
      expect(ns[0].id).toBe(6);
    });
  });

  // ── getPreferences ────────────────────────────────────────────────────

  it('getPreferences: should GET /notifications/preferences', () => {
    service.getPreferences().subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/preferences`);
    expect(req.request.method).toBe('GET');
    req.flush({} as NotificationPreferences);
  });

  it('getPreferences: should update preferences$', () => {
    const prefs: NotificationPreferences = {
      email_enabled: true,
      trip_reminders: true,
      itinerary_changes: false,
      expense_updates: true,
      collaborator_updates: false,
    };
    service.getPreferences().subscribe();
    httpMock.expectOne(`${BASE}/notifications/preferences`).flush(prefs);
    service.preferences$.subscribe(p => expect(p).toEqual(prefs));
  });

  // ── updatePreferences ─────────────────────────────────────────────────

  it('updatePreferences: should PUT /notifications/preferences', () => {
    service.updatePreferences({ email_enabled: true }).subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/preferences`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ email_enabled: true });
    req.flush({ email_enabled: true } as NotificationPreferences);
  });

  it('updatePreferences: should update preferences$ with returned value', () => {
    const returned: NotificationPreferences = {
      email_enabled: true,
      trip_reminders: false,
      itinerary_changes: false,
      expense_updates: false,
      collaborator_updates: false,
    };
    service.updatePreferences({ email_enabled: true }).subscribe();
    httpMock.expectOne(`${BASE}/notifications/preferences`).flush(returned);
    service.preferences$.subscribe(p => expect(p?.email_enabled).toBe(true));
  });
});
