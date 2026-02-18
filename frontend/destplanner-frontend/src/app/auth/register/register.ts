import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

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
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  checkStrength(password: string) {
    if (!password) return;

    if (password.length < 6) this.passwordStrength = 'Weak';
    else if (password.match(/[A-Z]/) && password.match(/[0-9]/))
      this.passwordStrength = 'Strong';
    else this.passwordStrength = 'Medium';
  }

  async submit() {
    if (this.registerForm.invalid) return;

    this.loading = true;

    try {
      const result = await this.auth.register(this.registerForm.value);
      this.snack.open(result, 'OK', { duration: 3000 });
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.snack.open(err, 'Close', { duration: 3000 });
    }

    this.loading = false;
  }

  
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

}



