import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

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
}

