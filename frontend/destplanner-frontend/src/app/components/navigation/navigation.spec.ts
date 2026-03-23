import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { NavigationComponent } from './navigation';
import { AuthService, User } from '../../services/auth';

const MOCK_USER: User = {
  id: 1, email: 'test@test.com',
  first_name: 'Jane', last_name: 'Doe',
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;

  const mockAuthService = {
    isLoggedIn$: of(false),
    currentUser$: of(null),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
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
});