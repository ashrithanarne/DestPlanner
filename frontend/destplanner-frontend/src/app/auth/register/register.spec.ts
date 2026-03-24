import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { RegisterComponent } from './register';
import { AuthService } from '../../services/auth';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authSpy: { register: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  // snack is spied on the REAL instance after component creation
  let snackOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authSpy   = { register: vi.fn().mockReturnValue(of({ message: 'ok' })) };
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router,      useValue: routerSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    // Spy on the real MatSnackBar instance resolved by the component's injector
    const snack = fixture.debugElement.injector.get(MatSnackBar);
    snackOpenSpy = vi.spyOn(snack, 'open');
  });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── form invalid on init ──────────────────────────────────────────────────
  it('registerForm: should be invalid when empty', () => {
    expect(component.registerForm.invalid).toBe(true);
  });

  // ── form valid ────────────────────────────────────────────────────────────
  it('registerForm: should be valid with all required fields', () => {
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    expect(component.registerForm.valid).toBe(true);
  });

  // ── submit — invalid form ─────────────────────────────────────────────────
  it('submit: should show snack and not call register when form is invalid', () => {
    component.registerForm.reset();
    component.submit();
    expect(authSpy.register).not.toHaveBeenCalled();
    expect(snackOpenSpy).toHaveBeenCalledWith(
      'Please fill in all required fields correctly', 'Close', { duration: 3000 }
    );
  });

  // ── submit — calls AuthService ────────────────────────────────────────────
  it('submit: should call register on valid form', async () => {
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    component.submit();
    await fixture.whenStable();
    expect(authSpy.register).toHaveBeenCalledWith({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
  });

  // ── submit — navigates to /login on success ───────────────────────────────
  it('submit: should navigate to /login on success', async () => {
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    component.submit();
    await fixture.whenStable();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  // ── submit — success snack ────────────────────────────────────────────────
  it('submit: should show success snack on register success', async () => {
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    component.submit();
    await fixture.whenStable();
    expect(snackOpenSpy).toHaveBeenCalledWith(
      'Account created! Please log in.', 'OK', { duration: 3000 }
    );
  });

  // ── submit — error snack ──────────────────────────────────────────────────
  it('submit: should show error snack on registration failure', async () => {
    authSpy.register.mockReturnValue(
      throwError(() => ({ error: { message: 'Email already exists' } }))
    );
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    component.submit();
    await fixture.whenStable();
    expect(snackOpenSpy).toHaveBeenCalledWith(
      'Email already exists', 'Close', { duration: 3000 }
    );
  });

  // ── submit — resets loading on error ─────────────────────────────────────
  it('submit: should reset loading to false on error', async () => {
    authSpy.register.mockReturnValue(throwError(() => ({})));
    component.registerForm.setValue({
      first_name: 'Jane', last_name: 'Doe',
      email: 'jane@test.com', password: 'Secure123',
    });
    component.submit();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  // ── checkStrength ─────────────────────────────────────────────────────────
  it('checkStrength: should return empty string for empty password', () => {
    component.checkStrength('');
    expect(component.passwordStrength).toBe('');
  });

  it('checkStrength: should return "Weak" for short password', () => {
    component.checkStrength('abc');
    expect(component.passwordStrength).toBe('Weak');
  });

  it('checkStrength: should return "Strong" for valid strong password', () => {
    component.checkStrength('Secure123');
    expect(component.passwordStrength).toBe('Strong');
  });

  it('checkStrength: should return "Medium" for medium password', () => {
    component.checkStrength('mediumpass');
    expect(component.passwordStrength).toBe('Medium');
  });

  // ── navigateToLogin ───────────────────────────────────────────────────────
  it('navigateToLogin: should navigate to /login', () => {
    component.navigateToLogin();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});