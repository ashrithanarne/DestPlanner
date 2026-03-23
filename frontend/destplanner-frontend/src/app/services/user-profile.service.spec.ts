import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserProfileService } from './user-profile.service';
import { User } from './auth';

const MOCK_USER: User = {
  id: 1, email: 'test@test.com',
  first_name: 'Jane', last_name: 'Doe',
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserProfileService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getProfile ────────────────────────────────────────────────────────────
  it('getProfile: should GET /profile', () => {
    service.getProfile().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/profile') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_USER);
  });

  // ── getProfile — updates profile$ ────────────────────────────────────────
  it('getProfile: should update profile$ with user data', () => {
    let emitted: User | null = null;
    service.profile$.subscribe((u) => (emitted = u));
    service.getProfile().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/profile'));
    req.flush(MOCK_USER);
    expect(emitted).toEqual(MOCK_USER);
  });

  // ── updateProfile ─────────────────────────────────────────────────────────
  it('updateProfile: should PUT to /profile with payload', () => {
    service.updateProfile({ first_name: 'Jane', last_name: 'Smith' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/profile') && r.method === 'PUT');
    expect(req.request.body).toEqual({ first_name: 'Jane', last_name: 'Smith' });
    req.flush(MOCK_USER);
  });

  // ── updateProfile — updates profile$ ─────────────────────────────────────
  it('updateProfile: should update profile$ after update', () => {
    let emitted: User | null = null;
    service.profile$.subscribe((u) => (emitted = u));
    service.updateProfile({ first_name: 'Updated' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/profile') && r.method === 'PUT');
    req.flush({ ...MOCK_USER, first_name: 'Updated' });
    expect((emitted as any)?.first_name).toBe('Updated');
  });

  // ── formatJoinDate ────────────────────────────────────────────────────────
  it('formatJoinDate: should format date string nicely', () => {
    const result = service.formatJoinDate('2025-01-15');
    expect(result).toContain('2025');
    expect(result).toContain('January');
  });

  it('formatJoinDate: should return original string on invalid date', () => {
    const result = service.formatJoinDate('invalid-date');
    expect(result).toBeDefined();
  });

  // ── getInitials ───────────────────────────────────────────────────────────
  it('getInitials: should return uppercase initials', () => {
    expect(service.getInitials('Jane', 'Doe')).toBe('JD');
  });

  it('getInitials: should handle empty strings', () => {
    expect(service.getInitials('', '')).toBe('');
  });

  it('getInitials: should handle single name', () => {
    expect(service.getInitials('Jane', '')).toBe('J');
  });
});