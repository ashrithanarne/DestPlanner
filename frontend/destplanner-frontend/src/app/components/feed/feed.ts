import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SocialService, FeedTrip } from '../../services/social.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './feed.html',
  styleUrls: ['./feed.css'],
})
export class FeedComponent implements OnInit {
  feed: FeedTrip[] = [];
  loading = true;
  loadingMore = false;
  page = 1;
  limit = 20;
  hasMore = true;

  currentUserId: number | null = null;

  constructor(
    private socialService: SocialService,
    private authService: AuthService,
    private router: Router,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id ?? null;
    });
    this.loadFeed(true);
  }

  loadFeed(reset = false): void {
    if (reset) {
      this.page = 1;
      this.feed = [];
      this.loading = true;
    } else {
      this.loadingMore = true;
    }

    this.socialService.getFeed(this.page, this.limit).subscribe({
      next: (res) => {
        this.feed = reset ? res.feed : [...this.feed, ...res.feed];
        this.hasMore = res.feed.length === this.limit;
        this.loading = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
        this.snack.open('Failed to load feed.', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      },
    });
  }

  loadMore(): void {
    this.page++;
    this.loadFeed(false);
  }

  viewTrip(trip: FeedTrip): void {
    this.router.navigate(['/users', trip.owner_id, 'trips', trip.trip_id]);
  }

  viewProfile(ownerId: number): void {
    this.router.navigate(['/users', ownerId, 'profile']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'planning': return 'accent';
      case 'ongoing': return 'primary';
      case 'completed': return 'primary';
      case 'cancelled': return 'warn';
      default: return 'accent';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'planning': return 'schedule';
      case 'ongoing': return 'flight_takeoff';
      case 'completed': return 'check_circle';
      case 'cancelled': return 'cancel';
      default: return 'luggage';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return this.formatDate(dateStr);
  }
}