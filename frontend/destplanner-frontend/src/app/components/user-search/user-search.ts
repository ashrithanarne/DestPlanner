import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, Subject } from 'rxjs';

import { SocialService } from '../../services/social.service';

export interface UserSearchResult {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './user-search.html',
  styleUrls: ['./user-search.css'],
})
export class UserSearchComponent implements OnInit {
  query = '';
  results: UserSearchResult[] = [];
  loading = false;
  searched = false;

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private socialService: SocialService,
    private snack: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.searchSubject.pipe(debounceTime(350)).subscribe(q => {
      if (q.trim().length >= 2) {
        this.runSearch(q.trim());
      } else {
        this.results = [];
        this.searched = false;
      }
    });
  }

  onQueryChange(): void {
    this.searchSubject.next(this.query);
  }

  runSearch(q: string): void {
    this.loading = true;
    this.searched = true;
    this.socialService.searchUsers(q).subscribe({
      next: (res) => {
        this.results = res.users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Search failed. Please try again.', 'Close', { duration: 3000 });
      },
    });
  }

  viewProfile(userId: number): void {
    this.router.navigate(['/users', userId, 'profile']);
  }

  goToFeed(): void {
    this.router.navigate(['/feed']);
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase();
  }
}