import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  loginForm: ReturnType<FormBuilder['group']>;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  submit() {
    if (this.loginForm.invalid) {
      this.snack.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    const { email, password, rememberMe } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        }
        this.snack.open(`Welcome back, ${res.user.first_name}!`, 'OK', { duration: 2500 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Invalid email or password';
        this.snack.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}