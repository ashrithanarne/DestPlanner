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
          sessionStorage.setItem('token', res.token);
          sessionStorage.setItem('user', JSON.stringify(res.user));
          this.loggedIn.next(true);
          this.currentUser.next(res.user);
        })
      );
  }

  // Logout - POST /api/auth/logout
  logout(): void {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({
        error: () => {}
      });
    }
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    this.loggedIn.next(false);
    this.currentUser.next(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  private hasToken(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    const token = sessionStorage.getItem('token');
    if (!token) return false;

    if (this.isTokenExpired(token)) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      return false;
    }

    return true;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length < 2 || typeof atob === 'undefined') return false;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { exp?: number };
      if (!payload.exp) return false;

      return Date.now() >= payload.exp * 1000;
    } catch {
      return false;
    }
  }

  private getStoredUser(): User | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}