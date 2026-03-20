import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expires_at: number;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUser = new BehaviorSubject<User | null>(this.getStoredUser());

  isLoggedIn$ = this.loggedIn.asObservable();
  currentUser$ = this.currentUser.asObservable();

  constructor(private http: HttpClient) {}

  // Register - POST /api/auth/register
  register(payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.baseUrl}/auth/register`,
      payload
    );
  }

  // Login - POST /api/auth/login
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.loggedIn.next(true);
          this.currentUser.next(res.user);
        })
      );
  }

  // Logout - POST /api/auth/logout
  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({
        error: () => {}
      });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.loggedIn.next(false);
    this.currentUser.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  private hasToken(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  private getStoredUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}