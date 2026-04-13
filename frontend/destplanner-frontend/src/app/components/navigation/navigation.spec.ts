import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { NavigationComponent } from './navigation';
import { AuthService, User } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';

const MOCK_USER: User = {
  id: 1, email: 'test@test.com',
  first_name: 'Jane', last_name: 'Doe',
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

// Shared unreadCount$ so we can push values in tests
const unreadCount$ = new BehaviorSubject<number>(0);

const mockAuthService = {
  isLoggedIn$: of(false),
  currentUser$: of(null),
  logout: vi.fn(),
};

const mockNotifService = {
  unreadCount$: unreadCount$.asObservable(),
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
};

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();
    unreadCount$.next(0);

    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotifService },
        provideRouter([]),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit — not authenticated ──────────────────────────────────────────
  it('ngOnInit: should set isAuthenticated to false when not logged in', () => {
    expect(component.isAuthenticated).toBe(false);
  });

  // ── ngOnInit — userName ───────────────────────────────────────────────────
  it('ngOnInit: should set userName to empty when no user', () => {
    expect(component.userName).toBe('');
  });

  // ── toggleMobileMenu ──────────────────────────────────────────────────────
  it('toggleMobileMenu: should toggle isMobileMenuOpen', () => {
    expect(component.isMobileMenuOpen).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(true);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(false);
  });

  // ── logout ────────────────────────────────────────────────────────────────
  it('logout: should call authService.logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  // ── navigateToProfile ─────────────────────────────────────────────────────
  it('navigateToProfile: should exist as a method', () => {
    expect(typeof component.navigateToProfile).toBe('function');
  });

  // ── navigateToMyTrips ─────────────────────────────────────────────────────
  it('navigateToMyTrips: should exist as a method', () => {
    expect(typeof component.navigateToMyTrips).toBe('function');
  });

  // ── navigateToLogin ───────────────────────────────────────────────────────
  it('navigateToLogin: should exist as a method', () => {
    expect(typeof component.navigateToLogin).toBe('function');
  });

  // ── navigateToRegister ────────────────────────────────────────────────────
  it('navigateToRegister: should exist as a method', () => {
    expect(typeof component.navigateToRegister).toBe('function');
  });

  // ── navigateToHome ────────────────────────────────────────────────────────
  it('navigateToHome: should exist as a method', () => {
    expect(typeof component.navigateToHome).toBe('function');
  });

  // ── Sprint 3: Notification polling ───────────────────────────────────────

  it('ngOnInit: should start polling on browser platform', () => {
    expect(mockNotifService.startPolling).toHaveBeenCalledWith(30000);
  });

  it('ngOnInit: should default unreadCount to 0', () => {
    expect(component.unreadCount).toBe(0);
  });

  it('unreadCount: should reflect value from notifService.unreadCount$', async () => {
    unreadCount$.next(5);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.unreadCount).toBe(5);
  });

  it('ngOnDestroy: should call stopPolling', () => {
    component.ngOnDestroy();
    expect(mockNotifService.stopPolling).toHaveBeenCalled();
  });
});
