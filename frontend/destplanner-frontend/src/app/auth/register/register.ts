import { Component, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {

  loading = false;
  passwordStrength = '';

  registerForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private snack: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])/)]]
    });
  }

  checkStrength(password: string) {
    if (!password) { this.passwordStrength = ''; return; }
    if (password.length < 6) this.passwordStrength = 'Weak';
    else if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.length >= 8)
      this.passwordStrength = 'Strong';
    else this.passwordStrength = 'Medium';
  }

  submit() {
    if (this.registerForm.invalid) {
      this.snack.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    const { first_name, last_name, email, password } = this.registerForm.value;

    this.auth.register({ first_name, last_name, email, password }).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.snack.open('Account created! Please log in.', 'OK', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Registration failed. Please try again.';
        this.snack.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}