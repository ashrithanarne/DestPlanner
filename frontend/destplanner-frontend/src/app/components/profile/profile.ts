import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserProfileService } from '../../services/user-profile.service';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit {
  profile: User | null = null;
  loading = true;
  saving = false;
  editMode = false;

  editForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private profileService: UserProfileService,
    private authService: AuthService,
    private snack: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.editForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    this.loading = true;
    this.profileService.getProfile().subscribe({
      next: (user) => {
        this.profile = user;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.snack.open('Session expired. Please log in again.', 'Close', { duration: 3000 });
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.snack.open('Failed to load profile.', 'Close', { duration: 3000 });
        }
      },
    });
  }

  enterEditMode(): void {
    if (!this.profile) return;
    this.editForm.patchValue({
      first_name: this.profile.first_name,
      last_name: this.profile.last_name,
      email: this.profile.email,
    });
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editForm.reset();
  }

  saveProfile(): void {
    if (this.editForm.invalid) {
      this.snack.open('Please fill in all fields correctly.', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();
    const { first_name, last_name, email } = this.editForm.value;

    this.profileService.updateProfile({ first_name, last_name, email }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.saving = false;
        this.editMode = false;
        this.cdr.detectChanges();
        this.snack.open('Profile updated successfully!', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.saving = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Failed to update profile.';
        this.snack.open(msg, 'Close', { duration: 3000 });
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getInitials(): string {
    if (!this.profile) return '?';
    return this.profileService.getInitials(this.profile.first_name, this.profile.last_name);
  }

  formatDate(dateStr: string): string {
    return this.profileService.formatJoinDate(dateStr);
  }
}