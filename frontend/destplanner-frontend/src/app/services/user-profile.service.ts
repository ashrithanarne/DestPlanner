import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from './auth';

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private baseUrl = environment.apiUrl;
  private profileSubject = new BehaviorSubject<User | null>(null);
  profile$ = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {}

  // GET /api/profile
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile`).pipe(
      tap((user) => {
        this.profileSubject.next(user);
        if (typeof localStorage !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  // PUT /api/profile
  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/profile`, payload).pipe(
      tap((user) => {
        this.profileSubject.next(user);
        if (typeof localStorage !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  // Format joined date nicely
  formatJoinDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Get initials for avatar
  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
  }
}