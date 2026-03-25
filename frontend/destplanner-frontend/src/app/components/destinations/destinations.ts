import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { DestinationService, Destination } from '../../services/destination';
import { BookmarkService } from '../../services/bookmark';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './destinations.html',
  styleUrl: './destinations.css'
})
export class DestinationsComponent implements OnInit {
  destinations: Destination[] = [];
  loading = true;
  isLoggedIn = false;

  constructor(
    private destService: DestinationService,
    private bookmarkService: BookmarkService,
    private authService: AuthService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadDestinations();
  }

  loadDestinations(): void {
    this.loading = true;
    this.destService.getDestinations().subscribe({
      next: (data) => {
        this.destinations = data || [];
        
        if (this.isLoggedIn) {
          this.bookmarkService.getBookmarks().subscribe({
            next: (bookmarks) => {
              const bookmarkedNames = new Set((bookmarks || []).map(b => b.destination));
              this.destinations.forEach(d => {
                d.is_bookmarked = bookmarkedNames.has(d.name);
              });
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
        this.snack.open('Failed to load destinations', 'Close', { duration: 3000 });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleBookmark(dest: Destination, event: Event): void {
    event.stopPropagation();
    
    if (!this.isLoggedIn) {
      this.snack.open('Please login to bookmark destinations', 'Login', { duration: 3000 }).onAction().subscribe(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    if (dest.is_bookmarked) {
      // Find the bookmark ID to delete
      this.bookmarkService.getBookmarks().subscribe({
        next: (bookmarks) => {
          const match = bookmarks.find(b => b.destination === dest.name);
          if (match) {
            this.bookmarkService.removeBookmark(match.id).subscribe({
              next: () => {
                dest.is_bookmarked = false;
                this.snack.open('Removed from bookmarks', 'OK', { duration: 2000 });
              },
              error: () => this.snack.open('Failed to remove bookmark', 'OK', { duration: 2000 })
            });
          }
        }
      });
    } else {
      this.bookmarkService.addBookmark(dest.id).subscribe({
        next: () => {
          dest.is_bookmarked = true;
          this.snack.open('Added to bookmarks', 'OK', { duration: 2000 });
        },
        error: () => this.snack.open('Failed to add bookmark', 'OK', { duration: 2000 })
      });
    }
  }

  viewDetails(dest: Destination): void {
    // We will implement destination details later in Task 3
    this.router.navigate(['/destinations', dest.id]);
  }
}
