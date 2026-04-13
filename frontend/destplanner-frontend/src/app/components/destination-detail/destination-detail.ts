import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { DestinationService, Destination, DestinationReview, DestinationActivity } from '../../services/destination';
import { BookmarkService } from '../../services/bookmark';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-destination-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule
  ],
  templateUrl: './destination-detail.html',
  styleUrl: './destination-detail.css'
})
export class DestinationDetailComponent implements OnInit {
  destination: Destination | null = null;
  loading = true;
  isLoggedIn = false;
  currentUserId: number | null = null;

  reviews: DestinationReview[] = [];
  averageRating = 0;
  totalReviews = 0;
  reviewsLoading = false;
  reviewsError = '';
  activities: DestinationActivity[] = [];
  activitiesLoading = false;
  activitiesError = '';
  submittingReview = false;
  editingReviewId: number | null = null;
  stars = [1, 2, 3, 4, 5];
  reviewForm!: FormGroup<{
    rating: FormControl<number>;
    comment: FormControl<string>;
  }>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destService: DestinationService,
    private bookmarkService: BookmarkService,
    private authService: AuthService,
    private snack: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.reviewForm = this.fb.nonNullable.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const destinationId = +id;
      this.loadDestination(destinationId);
      if (this.isLoggedIn) {
        this.loadActivities(destinationId);
        this.loadReviews(destinationId);
      } else {
        this.activitiesError = 'Please login to view destination activities.';
        this.reviewsError = 'Please login to view and submit reviews.';
      }
    } else {
      this.router.navigate(['/destinations']);
    }
  }

  loadDestination(id: number): void {
    this.loading = true;
    this.destService.getDestinationById(id).subscribe({
      next: (dest) => {
        this.destination = dest;
        if (this.isLoggedIn) {
          this.bookmarkService.getBookmarks().subscribe({
            next: (bookmarks) => {
              const bookmarkedNames = new Set(bookmarks.map(b => b.destination));
              this.destination!.is_bookmarked = bookmarkedNames.has(this.destination!.name);
              this.loading = false;
            },
            error: (err: { status?: number }) => {
              if (err.status === 401) {
                this.isLoggedIn = false;
              }
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.snack.open('Failed to load destination details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  toggleBookmark(): void {
    if (!this.destination) return;
    
    if (!this.isLoggedIn) {
      this.snack.open('Please login to bookmark this destination', 'Login', { duration: 3000 })
        .onAction().subscribe(() => this.router.navigate(['/login']));
      return;
    }

    if (this.destination.is_bookmarked) {
      this.bookmarkService.getBookmarks().subscribe({
        next: (bookmarks) => {
          const match = bookmarks.find(b => b.destination === this.destination!.name);
          if (match) {
            this.bookmarkService.removeBookmark(match.id).subscribe({
              next: () => {
                this.destination!.is_bookmarked = false;
                this.snack.open('Removed from bookmarks', 'OK', { duration: 2000 });
              },
              error: (err: { status?: number }) => {
                if (err.status === 401) {
                  this.isLoggedIn = false;
                  this.snack.open('Session expired. Please login again.', 'Login', { duration: 3000 })
                    .onAction().subscribe(() => this.router.navigate(['/login']));
                  return;
                }
                this.snack.open('Failed to remove bookmark', 'OK', { duration: 2000 });
              },
            });
          }
        },
        error: (err: { status?: number }) => {
          if (err.status === 401) {
            this.isLoggedIn = false;
            this.snack.open('Session expired. Please login again.', 'Login', { duration: 3000 })
              .onAction().subscribe(() => this.router.navigate(['/login']));
          }
        },
      });
    } else {
      this.bookmarkService.addBookmark(this.destination.id).subscribe({
        next: () => {
          this.destination!.is_bookmarked = true;
          this.snack.open('Added to bookmarks', 'OK', { duration: 2000 });
        },
        error: (err: { status?: number }) => {
          if (err.status === 401) {
            this.isLoggedIn = false;
            this.snack.open('Session expired. Please login again.', 'Login', { duration: 3000 })
              .onAction().subscribe(() => this.router.navigate(['/login']));
            return;
          }
          this.snack.open('Failed to add bookmark', 'OK', { duration: 2000 });
        }
      });
    }
  }

  loadReviews(destinationId: number): void {
    this.reviewsLoading = true;
    this.reviewsError = '';
    this.destService.getReviews(destinationId).subscribe({
      next: (res) => {
        this.reviews = res.reviews || [];
        this.averageRating = res.average_rating || 0;
        this.totalReviews = res.total_reviews || 0;
        this.reviewsLoading = false;
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.reviewsLoading = false;
        if (err.status === 401) {
          this.isLoggedIn = false;
          this.reviewsError = 'Please login to view and submit reviews.';
        } else {
          this.reviewsError = err.error?.message || 'Failed to load reviews';
        }
      },
    });
  }

  loadActivities(destinationId: number): void {
    this.activitiesLoading = true;
    this.activitiesError = '';
    this.destService.getActivities(destinationId).subscribe({
      next: (res) => {
        this.activities = res.activities || [];
        this.activitiesLoading = false;
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.activitiesLoading = false;
        if (err.status === 401) {
          this.isLoggedIn = false;
          this.activitiesError = 'Please login to view destination activities.';
          return;
        }
        this.activitiesError = err.error?.message || 'Failed to load activities';
      },
    });
  }

  setRating(value: number): void {
    this.reviewForm.controls.rating.setValue(value);
  }

  canEditReview(review: DestinationReview): boolean {
    return this.currentUserId !== null && review.user_id === this.currentUserId;
  }

  startEdit(review: DestinationReview): void {
    this.editingReviewId = review.id;
    this.reviewForm.patchValue({
      rating: review.rating,
      comment: review.comment,
    });
  }

  cancelEdit(): void {
    this.editingReviewId = null;
    this.reviewForm.reset({ rating: 5, comment: '' });
  }

  submitReview(): void {
    if (!this.destination || !this.isLoggedIn) return;

    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      this.snack.open('Please provide a rating and review comment.', 'Close', { duration: 3000 });
      return;
    }

    const comment = this.reviewForm.controls.comment.value.trim();
    if (!comment) {
      this.snack.open('Comment is required.', 'Close', { duration: 3000 });
      return;
    }

    this.submittingReview = true;
    const payload = {
      rating: this.reviewForm.controls.rating.value,
      comment,
    };

    const request$ = this.editingReviewId
      ? this.destService.updateReview(this.destination.id, this.editingReviewId, payload)
      : this.destService.createReview(this.destination.id, payload);

    request$.subscribe({
      next: () => {
        this.submittingReview = false;
        const message = this.editingReviewId ? 'Review updated successfully' : 'Review submitted successfully';
        this.snack.open(message, 'OK', { duration: 2000 });
        this.cancelEdit();
        this.loadReviews(this.destination!.id);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.submittingReview = false;
        if (err.status === 401) {
          this.isLoggedIn = false;
          this.reviewsError = 'Please login to view and submit reviews.';
          this.snack.open('Session expired. Please login again.', 'Login', { duration: 3000 })
            .onAction().subscribe(() => this.router.navigate(['/login']));
          return;
        }
        const msg = err.error?.message || 'Failed to submit review';
        this.snack.open(msg, 'Close', { duration: 3000 });
      },
    });
  }

  deleteReview(reviewId: number): void {
    if (!this.destination || !this.isLoggedIn) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete your review?')) return;

    this.destService.deleteReview(this.destination.id, reviewId).subscribe({
      next: () => {
        this.snack.open('Review deleted', 'OK', { duration: 2000 });
        if (this.editingReviewId === reviewId) {
          this.cancelEdit();
        }
        this.loadReviews(this.destination!.id);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        if (err.status === 401) {
          this.isLoggedIn = false;
          this.reviewsError = 'Please login to view and submit reviews.';
          this.snack.open('Session expired. Please login again.', 'Login', { duration: 3000 })
            .onAction().subscribe(() => this.router.navigate(['/login']));
          return;
        }
        const msg = err.error?.message || 'Failed to delete review';
        this.snack.open(msg, 'Close', { duration: 3000 });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/destinations']);
  }
}
