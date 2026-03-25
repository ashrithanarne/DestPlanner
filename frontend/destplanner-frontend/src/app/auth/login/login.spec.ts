import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login';
import { AuthService } from '../../services/auth';

const MOCK_USER = {
  id: 1, email: 'test@test.com',
  first_name: 'Test', last_name: 'User',
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const mockAuthService = {
    login: vi.fn(() => of({ token: 'tok', user: MOCK_USER, expires_at: 9999 })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthService.login.mockReturnValue(of({ token: 'tok', user: MOCK_USER, expires_at: 9999 }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── loginForm initialised ────────────────────────────────────────────────
  it('should initialise loginForm with email, password and rememberMe controls', () => {
    expect(component.loginForm.contains('email')).toBe(true);
    expect(component.loginForm.contains('password')).toBe(true);
    expect(component.loginForm.contains('rememberMe')).toBe(true);
  });

  // ── form invalid by default ──────────────────────────────────────────────
  it('should be invalid when form is empty', () => {
    expect(component.loginForm.invalid).toBe(true);
  });

  // ── email validation ─────────────────────────────────────────────────────
  it('should mark email as invalid when not an email format', () => {
    component.loginForm.patchValue({ email: 'notanemail', password: 'pass' });
    expect(component.loginForm.get('email')?.invalid).toBe(true);
  });

  it('should mark form as valid with correct email and password', () => {
    component.loginForm.patchValue({ email: 'user@test.com', password: 'pass123' });
    expect(component.loginForm.valid).toBe(true);
  });

  // ── loading starts as false ──────────────────────────────────────────────
  it('should have loading as false initially', () => {
    expect(component.loading).toBe(false);
  });

  // ── submit — invalid form ────────────────────────────────────────────────
  it('submit: should not call auth.login when form is invalid', () => {
    component.loginForm.reset();
    component.submit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  // ── submit — valid form ──────────────────────────────────────────────────
  it('submit: should call auth.login with email and password', async () => {
    component.loginForm.patchValue({ email: 'user@test.com', password: 'pass123' });
    component.submit();
    await fixture.whenStable();
    expect(mockAuthService.login).toHaveBeenCalledWith('user@test.com', 'pass123');
  });

  // ── submit — resets loading on success ──────────────────────────────────
  it('submit: should set loading to false after success', async () => {
    component.loginForm.patchValue({ email: 'user@test.com', password: 'pass123' });
    component.submit();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  // ── submit — resets loading on error ────────────────────────────────────
  it('submit: should set loading to false after error', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => ({ error: { message: 'Invalid' } })));
    component.loginForm.patchValue({ email: 'user@test.com', password: 'wrong' });
    component.submit();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  // ── navigateToRegister ───────────────────────────────────────────────────
  it('navigateToRegister: should be a defined method', () => {
    expect(typeof component.navigateToRegister).toBe('function');
  });
});
