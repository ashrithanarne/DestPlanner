import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

import { SocialService, PublicProfile, FollowListEntry, FeedTrip } from '../../services/social.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDividerModule,
  ],
  templateUrl: './public-profile.html',
  styleUrls: ['./public-profile.css'],
})
export class PublicProfileComponent implements OnInit {
  profile: PublicProfile | null = null;
  publicTrips: FeedTrip[] = [];
  followers: FollowListEntry[] = [];
  following: FollowListEntry[] = [];

  loading = true;
  followLoading = false;
  tripsLoading = false;
  followersLoading = false;
  followingLoading = false;

  targetUserId!: number;
  currentUserId: number | null = null;
  isOwnProfile = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socialService: SocialService,
    private authService: AuthService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id ?? null;
    });

    this.route.params.subscribe(params => {
      this.targetUserId = +params['id'];
      this.isOwnProfile = this.currentUserId === this.targetUserId;
      this.loadProfile();
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.socialService.getPublicProfile(this.targetUserId).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
        this.loadPublicTrips();
        this.loadFollowers();
        this.loadFollowing();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (err.status === 404) {
          this.snack.open('User not found.', 'Close', { duration: 3000 });
          this.router.navigate(['/feed']);
        } else {
          this.snack.open('Failed to load profile.', 'Close', { duration: 3000 });
        }
      },
    });
  }

  loadPublicTrips(): void {
    this.tripsLoading = true;
    this.socialService.getPublicTripsForUser(this.targetUserId).subscribe({
      next: (res) => {
        this.publicTrips = res.trips;
        this.tripsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.tripsLoading = false; this.cdr.detectChanges(); }
    });
  }

  loadFollowers(): void {
    this.followersLoading = true;
    this.socialService.getFollowers(this.targetUserId).subscribe({
      next: (res) => {
        this.followers = res.followers;
        this.followersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.followersLoading = false; this.cdr.detectChanges(); }
    });
  }

  loadFollowing(): void {
    this.followingLoading = true;
    this.socialService.getFollowing(this.targetUserId).subscribe({
      next: (res) => {
        this.following = res.following;
        this.followingLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.followingLoading = false; this.cdr.detectChanges(); }
    });
  }

  toggleFollow(): void {
    if (!this.profile) return;
    this.followLoading = true;
    const action$ = this.profile.is_following
      ? this.socialService.unfollowUser(this.targetUserId)
      : this.socialService.followUser(this.targetUserId);

    action$.subscribe({
      next: () => {
        if (this.profile) {
          if (this.profile.is_following) {
            this.profile.is_following = false;
            this.profile.follower_count--;
          } else {
            this.profile.is_following = true;
            this.profile.follower_count++;
          }
        }
        this.followLoading = false;
        this.loadFollowers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.followLoading = false;
        this.cdr.detectChanges();
        const msg = err?.error?.message || 'Action failed.';
        this.snack.open(msg, 'Close', { duration: 3000 });
      },
    });
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getStatusClass(status: string): string {
    return 'status-' + status;
  }

  viewTrip(trip: FeedTrip): void {
    this.router.navigate(['/users', trip.owner_id, 'trips', trip.trip_id]);
  }

  navigateToProfile(userId: number): void {
    this.router.navigate(['/users', userId, 'profile']);
  }

  goToMyProfile(): void {
    this.router.navigate(['/profile']);
  }
}