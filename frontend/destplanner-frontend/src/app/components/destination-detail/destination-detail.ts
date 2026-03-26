import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { DestinationService, Destination } from '../../services/destination';
import { BookmarkService } from '../../services/bookmark';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-destination-detail',
  standalone: true,
  imports: [
    CommonModule,
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destService: DestinationService,
    private bookmarkService: BookmarkService,
    private authService: AuthService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDestination(+id);
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
              this.cdr.detectChanges();
            },
            error: () => {
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.snack.open('Failed to load destination details', 'Close', { duration: 3000 });
        this.loading = false;
        this.cdr.detectChanges();
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
              }
            });
          }
        }
      });
    } else {
      this.bookmarkService.addBookmark(this.destination.id).subscribe({
        next: () => {
          this.destination!.is_bookmarked = true;
          this.snack.open('Added to bookmarks', 'OK', { duration: 2000 });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/destinations']);
  }
}
