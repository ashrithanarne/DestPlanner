import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Auth state
  private loggedIn = new BehaviorSubject<boolean>(false);
  private username = new BehaviorSubject<string>('');

  isLoggedIn$ = this.loggedIn.asObservable();
  username$ = this.username.asObservable();

  // Registration (already exists)
  register(user: any): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (user.email === 'test@test.com') {
          reject('User already exists');
        } else {
          resolve('Registration successful');
        }
      }, 1200);
    });
  }

  // New: Mock login
  login(username: string, password?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username) {
          this.loggedIn.next(true);
          this.username.next(username);
          resolve('Login successful');
        } else {
          reject('Invalid credentials');
        }
      }, 500);
    });
  }

  // Logout
  logout() {
    this.loggedIn.next(false);
    this.username.next('');
  }
}

