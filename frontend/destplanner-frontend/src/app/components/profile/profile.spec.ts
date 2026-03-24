import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({ template: '' })
class DummyComponent {}

const testRoutes: Routes = [
  { path: 'login', component: DummyComponent },
  { path: '', component: DummyComponent },
];
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Router } from '@angular/router';

import { ProfileComponent } from './profile';
import { UserProfileService } from '../../services/user-profile.service';
import { AuthService, User } from '../../services/auth';

const MOCK_USER: User = {
  id: 1,
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockProfileService = {
  getProfile: vi.fn(() => of(MOCK_USER)),
  updateProfile: vi.fn(() => of(MOCK_USER)),
  getInitials: vi.fn(() => 'JD'),
  formatJoinDate: vi.fn(() => 'January 1, 2026'),
};

const mockAuthService = {
  logout: vi.fn(),
};

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockProfileService.getProfile.mockReturnValue(of(MOCK_USER));
    mockProfileService.updateProfile.mockReturnValue(of(MOCK_USER));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: UserProfileService, useValue: mockProfileService },
        { provide: AuthService, useValue: mockAuthService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(testRoutes),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit: should load profile on init', () => {
    expect(mockProfileService.getProfile).toHaveBeenCalled();
  });

  it('ngOnInit: should set profile after load', async () => {
    await fixture.whenStable();
    expect(component.profile).toEqual(MOCK_USER);
  });

  it('ngOnInit: should set loading to false after load', async () => {
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('loadProfile: should handle 401 error and navigate to login', async () => {
    mockProfileService.getProfile.mockReturnValue(
      throwError(() => ({ status: 401 }))
    );
    const spy = vi.spyOn(router, 'navigate');
    component.loadProfile();
    await fixture.whenStable();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('loadProfile: should set loading false on non-401 error', async () => {
    mockProfileService.getProfile.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );
    component.loadProfile();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('enterEditMode: should set editMode to true and patch form', () => {
    component.profile = MOCK_USER;
    component.enterEditMode();
    expect(component.editMode).toBe(true);
    expect(component.editForm.value.first_name).toBe('John');
    expect(component.editForm.value.last_name).toBe('Doe');
    expect(component.editForm.value.email).toBe('john@example.com');
  });

  it('enterEditMode: should do nothing if no profile', () => {
    component.profile = null;
    component.enterEditMode();
    expect(component.editMode).toBe(false);
  });

  it('cancelEdit: should set editMode to false and reset form', () => {
    component.editMode = true;
    component.cancelEdit();
    expect(component.editMode).toBe(false);
  });

  it('saveProfile: should not call updateProfile if form is invalid', () => {
    component.editForm.reset();
    component.saveProfile();
    expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
  });

  it('saveProfile: should call updateProfile with form values', async () => {
    component.editForm.setValue({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
    });
    component.saveProfile();
    await fixture.whenStable();
    expect(mockProfileService.updateProfile).toHaveBeenCalledWith({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
    });
  });

  it('saveProfile: should set editMode to false after success', async () => {
    component.editForm.setValue({
      first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com',
    });
    component.saveProfile();
    await fixture.whenStable();
    expect(component.editMode).toBe(false);
    expect(component.saving).toBe(false);
  });

  it('saveProfile: should set saving to false on error', async () => {
    mockProfileService.updateProfile.mockReturnValue(
      throwError(() => ({ error: { message: 'Failed' } }))
    );
    component.editForm.setValue({
      first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com',
    });
    component.saveProfile();
    await fixture.whenStable();
    expect(component.saving).toBe(false);
  });

  it('logout: should call authService.logout and navigate to /', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(['/']);
  });

  it('getInitials: should delegate to profileService', () => {
    component.profile = MOCK_USER;
    const result = component.getInitials();
    expect(mockProfileService.getInitials).toHaveBeenCalledWith('John', 'Doe');
    expect(result).toBe('JD');
  });

  it('getInitials: should return ? if no profile', () => {
    component.profile = null;
    expect(component.getInitials()).toBe('?');
  });

  it('formatDate: should delegate to profileService', () => {
    const result = component.formatDate('2026-01-01T00:00:00Z');
    expect(mockProfileService.formatJoinDate).toHaveBeenCalledWith('2026-01-01T00:00:00Z');
    expect(result).toBe('January 1, 2026');
  });
});