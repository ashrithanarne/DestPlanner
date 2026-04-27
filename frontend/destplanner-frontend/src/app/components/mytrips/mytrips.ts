import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TripService, Trip } from '../../services/trip.service';
import { BudgetService, BudgetSummary } from '../../services/budget';
import { TripInviteComponent } from '../trip-invite/trip-invite';

@Component({
  selector: 'app-mytrips',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    TripInviteComponent,
  ],
  templateUrl: './mytrips.html',
  styleUrls: ['./mytrips.css'],
})
export class MyTripsComponent implements OnInit {
  trips: Trip[] = [];
  filteredTrips: Trip[] = [];
  budgetsByTrip: Record<number, BudgetSummary> = {};
 
  loadingTrips = false;
  savingTrip = false;
  deletingTripId: number | null = null;
  activeFilter = 'all';
 
  showCreateForm = false;
  createForm!: FormGroup;
 
  editingTrip: Trip | null = null;
  editForm!: FormGroup;
 
  readonly statuses = ['planning', 'ongoing', 'completed', 'cancelled'];

  /** Track which trip's invite panel is open (null = none) */
  invitePanelTripId: number | null = null;

  constructor(
    private tripService: TripService,
    private budgetService: BudgetService,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}
 
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
 
    this.createForm = this.fb.group({
      trip_name: ['', Validators.required],
      destination: [''],
      start_date: [''],
      end_date: [''],
      notes: [''],
    });
 
    this.editForm = this.fb.group({
      trip_name: ['', Validators.required],
      destination: [''],
      start_date: [''],
      end_date: [''],
      notes: [''],
      status: ['planning'],
    });
 
    this.loadTrips();
    this.loadBudgets();
  }
 
  loadTrips(): void {
    this.loadingTrips = true;
    this.tripService.getTrips().subscribe({
      next: (res: any) => {
        this.trips = res?.trips ?? res ?? [];
        this.applyFilter(this.activeFilter);
        this.loadingTrips = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loadingTrips = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/my-trips' } });
        } else {
          // Auto-retry once after 2 seconds
          this.snack.open('Connection issue — retrying...', 'Close', { duration: 2000 });
          setTimeout(() => {
            this.tripService.getTrips().subscribe({
              next: (res: any) => {
                this.trips = res?.trips ?? res ?? [];
                this.applyFilter(this.activeFilter);
                this.loadingTrips = false;
                this.cdr.detectChanges();
              },
              error: () => {
                this.loadingTrips = false;
                this.cdr.detectChanges();
                this.snack.open('Failed to load trips. Please refresh.', 'Close', { duration: 4000 });
              },
            });
          }, 2000);
        }
      },
    });
  }
 
  loadBudgets(): void {
    this.budgetService.getBudgets().subscribe({
      next: (res: any) => {
        const budgets: BudgetSummary[] = res?.budgets ?? res ?? [];
        this.budgetsByTrip = {};
        budgets.forEach(b => {
          if (b.trip_id) this.budgetsByTrip[b.trip_id] = b;
        });
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }
 
  applyFilter(filter: string): void {
    this.activeFilter = filter;
    this.filteredTrips =
      filter === 'all' ? [...this.trips] : this.trips.filter(t => t.status === filter);
  }
 
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset();
    }
  }
 
  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.savingTrip = true;
    this.tripService.createTrip(this.createForm.value).subscribe({
      next: () => {
        this.savingTrip = false;
        this.showCreateForm = false;
        this.createForm.reset();
        this.loadTrips();
        this.snack.open('Trip created!', 'Close', { duration: 2000 });
      },
      error: () => {
        this.savingTrip = false;
        this.snack.open('Failed to create trip', 'Close', { duration: 3000 });
      },
    });
  }
 
  startEdit(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    this.editingTrip = trip;
    this.editForm.patchValue({
      trip_name: trip.trip_name,
      destination: trip.destination ?? '',
      start_date: trip.start_date ?? '',
      end_date: trip.end_date ?? '',
      notes: trip.notes ?? '',
      status: trip.status,
    });
  }
 
  cancelEdit(): void {
    this.editingTrip = null;
    this.editForm.reset({ status: 'planning' });
  }
 
  submitEdit(): void {
    if (!this.editingTrip || this.editForm.invalid) return;
    this.savingTrip = true;
    this.tripService.updateTrip(this.editingTrip.id, this.editForm.value).subscribe({
      next: () => {
        this.savingTrip = false;
        this.editingTrip = null;
        this.loadTrips();
        this.snack.open('Trip updated!', 'Close', { duration: 2000 });
      },
      error: () => {
        this.savingTrip = false;
        this.snack.open('Failed to update trip', 'Close', { duration: 3000 });
      },
    });
  }
 
  deleteTrip(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Delete "${trip.trip_name}"?`)) return;
    this.deletingTripId = trip.id;
    this.tripService.deleteTrip(trip.id).subscribe({
      next: () => {
        this.deletingTripId = null;
        this.loadTrips();
        this.snack.open('Trip deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.deletingTripId = null;
        this.snack.open('Failed to delete trip', 'Close', { duration: 3000 });
      },
    });
  }
 
  openBudget(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/budget'], { queryParams: { trip_id: trip.id } });
  }
 
  openPackingList(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/trips', trip.id, 'packing-list']);
  }
 
  openItinerary(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/trips', trip.id, 'itinerary']);
  }
 
  // ── Sprint 3: Visual timeline ──────────────────────────────────────────────
  openTimeline(tripId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/timeline', tripId]);
  }

  // ── Sprint 4: Invite collaborators ────────────────────────────────────────
  toggleInvitePanel(trip: Trip, event: MouseEvent): void {
    event.stopPropagation();
    this.invitePanelTripId = this.invitePanelTripId === trip.id ? null : trip.id;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getStatusConfig(status: string): { label: string; color: string; icon: string } {
    const map: Record<string, { label: string; color: string; icon: string }> = {
      planning:  { label: 'Planning',  color: '#1976d2', icon: 'edit_calendar'   },
      ongoing:   { label: 'Ongoing',   color: '#388e3c', icon: 'flight_takeoff'  },
      completed: { label: 'Completed', color: '#7b1fa2', icon: 'check_circle'    },
      cancelled: { label: 'Cancelled', color: '#d32f2f', icon: 'cancel'          },
    };
    return map[status] ?? { label: status, color: '#757575', icon: 'help_outline' };
  }
 
  getStatusCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: this.trips.length };
    this.statuses.forEach(s => {
      counts[s] = this.trips.filter(t => t.status === s).length;
    });
    return counts;
  }
 
  formatDateRange(trip: Trip): string {
    if (!trip.start_date) return 'Dates TBD';
    const start = new Date(trip.start_date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!trip.end_date) return start;
    const end = new Date(trip.end_date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    return `${start} – ${end}`;
  }
 
  getDurationLabel(trip: Trip): string {
    if (!trip.duration_days) return '';
    return trip.duration_days === 1 ? '1 day' : `${trip.duration_days} days`;
  }
 
  getPackingProgressColor(pct: number): 'primary' | 'accent' | 'warn' {
    if (pct >= 80) return 'primary';
    if (pct >= 40) return 'accent';
    return 'warn';
  }
 
  trackByTripId(_: number, trip: Trip): number {
    return trip.id;
  }
}