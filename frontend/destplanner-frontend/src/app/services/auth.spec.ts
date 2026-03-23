import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService, User } from './auth';

const MOCK_USER: User = {
  id: 1, email: 'test@test.com',
  first_name: 'Test', last_name: 'User',
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

const MOCK_LOGIN_RESPONSE = {
  token: 'mock-token-123',
  user: MOCK_USER,
  expires_at: 9999999999,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  // should be created 
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //  register 
  it('register: should POST to /auth/register', () => {
    service.register({ first_name: 'Test', last_name: 'User', email: 'test@test.com', password: 'Pass123!' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/register'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.email).toBe('test@test.com');
    req.flush({ message: 'User registered', user_id: 1 });
  });

  // login 
  it('login: should POST to /auth/login and store token in sessionStorage', () => {
    service.login('test@test.com', 'Pass123!').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush(MOCK_LOGIN_RESPONSE);
    expect(sessionStorage.getItem('token')).toBe('mock-token-123');
  });

  //  login — updates isLoggedIn$ 
  it('login: should update isLoggedIn$ to true on success', () => {
    let isLoggedIn = false;
    service.isLoggedIn$.subscribe((v) => (isLoggedIn = v));
    service.login('test@test.com', 'Pass123!').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    req.flush(MOCK_LOGIN_RESPONSE);
    expect(isLoggedIn).toBe(true);
  });

  //  login — updates currentUser$ 
  it('login: should update currentUser$ with user data', () => {
    let currentUser: User | null = null;
    service.currentUser$.subscribe((u) => (currentUser = u));
    service.login('test@test.com', 'Pass123!').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    req.flush(MOCK_LOGIN_RESPONSE);
    expect(currentUser).toEqual(MOCK_USER);
  });

  //  logout 
  it('logout: should clear sessionStorage and update isLoggedIn$ to false', () => {
    sessionStorage.setItem('token', 'mock-token');
    sessionStorage.setItem('user', JSON.stringify(MOCK_USER));
    let isLoggedIn = true;
    service.isLoggedIn$.subscribe((v) => (isLoggedIn = v));

    service.logout();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/logout'));
    req.flush({ message: 'Logged out' });

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(isLoggedIn).toBe(false);
  });

  //logout — clears currentUser$ 
  it('logout: should set currentUser$ to null', () => {
    sessionStorage.setItem('token', 'mock-token');
    let currentUser: User | null = MOCK_USER;
    service.currentUser$.subscribe((u) => (currentUser = u));

    service.logout();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/logout'));
    req.flush({});

    expect(currentUser).toBeNull();
  });

  //getToken 
  it('getToken: should return token from sessionStorage', () => {
    sessionStorage.setItem('token', 'test-token');
    expect(service.getToken()).toBe('test-token');
  });

  it('getToken: should return null when no token', () => {
    expect(service.getToken()).toBeNull();
  });

  // isLoggedIn
  it('isLoggedIn: should return true when token exists', () => {
    sessionStorage.setItem('token', 'test-token');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('isLoggedIn: should return false when no token', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  //  getCurrentUser 
  it('getCurrentUser: should return null when not logged in', () => {
    expect(service.getCurrentUser()).toBeNull();
  });
});