import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';

import { TripService, Trip, UpdateTripPayload } from '../../services/trip.service';
import { BudgetService, BudgetSummary } from '../../services/budget';

export const TRIP_STATUSES = ['planning', 'ongoing', 'completed', 'cancelled'];

@Component({
  selector: 'app-my-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './mytrips.html',
  styleUrls: ['./mytrips.css'],
})
export class MyTripsComponent implements OnInit, OnDestroy {
  trips: Trip[] = [];
  filteredTrips: Trip[] = [];

  loadingTrips = false;
  savingTrip = false;
  deletingTripId: number | null = null;

  showCreateForm = false;
  editingTrip: Trip | null = null;

  activeFilter = 'all';
  statuses = TRIP_STATUSES;

  budgetsByTrip: Record<number, BudgetSummary> = {};
  loadingBudgets = false;

  private subs = new Subscription();

  createForm: ReturnType<FormBuilder['group']>;
  editForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private budgetService: BudgetService,
    private snack: MatSnackBar,
    public router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
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
      status: ['planning', Validators.required],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
      this.loadTrips();
      this.loadBudgets();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadTrips(): void {
    this.loadingTrips = true;
    this.tripService.getTrips().subscribe({
      next: (res) => {
        this.trips = res?.trips ?? [];
        this.applyFilter(this.activeFilter);
        this.loadingTrips = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingTrips = false;
        this.cdr.detectChanges();
        if (err.status === 401) {
          this.snack.open('Session expired. Please log in again.', 'Close', { duration: 3000 });
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/mytrips' } });
        } else {
          this.snack.open('Failed to load trips.', 'Close', { duration: 3000 });
        }
      },
    });
  }

  loadBudgets(): void {
    this.loadingBudgets = true;
    this.budgetService.getBudgets().subscribe({
      next: (res) => {
        this.budgetsByTrip = {};
        for (const b of (res?.budgets ?? [])) {
          if (b.trip_id) this.budgetsByTrip[b.trip_id] = b;
        }
        this.loadingBudgets = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingBudgets = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    this.filteredTrips = filter === 'all'
      ? [...this.trips]
      : this.trips.filter(t => t.status === filter);
    this.cdr.detectChanges();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.editingTrip = null;
    if (!this.showCreateForm) this.createForm.reset();
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.snack.open('Trip name is required.', 'Close', { duration: 3000 });
      return;
    }
    this.savingTrip = true;
    this.cdr.detectChanges();
    const { trip_name, destination, start_date, end_date, notes } = this.createForm.value;
    this.tripService.createTrip({
      trip_name,
      destination: destination || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      notes: notes || undefined,
    }).subscribe({
      next: () => {
        this.savingTrip = false;
        this.showCreateForm = false;
        this.createForm.reset();
        this.cdr.detectChanges();
        this.snack.open('Trip created!', 'OK', { duration: 2500 });
        this.loadTrips();
      },
      error: (err) => {
        this.savingTrip = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to create trip.', 'Close', { duration: 3000 });
      },
    });
  }

  startEdit(trip: Trip, event: Event): void {
    event.stopPropagation();
    this.editingTrip = trip;
    this.showCreateForm = false;
    this.editForm.patchValue({
      trip_name: trip.trip_name,
      destination: trip.destination || '',
      start_date: trip.start_date ? trip.start_date.slice(0, 10) : '',
      end_date: trip.end_date ? trip.end_date.slice(0, 10) : '',
      notes: trip.notes || '',
      status: trip.status,
    });
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingTrip = null;
    this.editForm.reset();
  }

  submitEdit(): void {
    if (!this.editingTrip || this.editForm.invalid) return;
    this.savingTrip = true;
    this.cdr.detectChanges();
    const { trip_name, destination, start_date, end_date, notes, status } = this.editForm.value;
    const payload: UpdateTripPayload = {
      trip_name,
      destination: destination || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      notes: notes || undefined,
      status,
    };
    this.tripService.updateTrip(this.editingTrip.id, payload).subscribe({
      next: () => {
        this.savingTrip = false;
        this.editingTrip = null;
        this.editForm.reset();
        this.cdr.detectChanges();
        this.snack.open('Trip updated!', 'OK', { duration: 2500 });
        this.loadTrips();
      },
      error: (err) => {
        this.savingTrip = false;
        this.cdr.detectChanges();
        this.snack.open(err?.error?.message || 'Failed to update trip.', 'Close', { duration: 3000 });
      },
    });
  }

  deleteTrip(trip: Trip, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${trip.trip_name}"? This will also remove linked packing lists.`)) return;
    this.deletingTripId = trip.id;
    this.cdr.detectChanges();
    this.tripService.deleteTrip(trip.id).subscribe({
      next: () => {
        this.deletingTripId = null;
        this.snack.open('Trip deleted.', 'OK', { duration: 2000 });
        this.loadTrips();
        this.loadBudgets();
      },
      error: () => {
        this.deletingTripId = null;
        this.cdr.detectChanges();
        this.snack.open('Failed to delete trip.', 'Close', { duration: 3000 });
      },
    });
  }

  openBudget(trip: Trip, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/budget'], { queryParams: { trip_id: trip.id } });
  }

  /** Navigate to the itinerary page for this trip */
  openItinerary(trip: Trip, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/trips', trip.id, 'itinerary']);
  }
  getStatusConfig(status: string): { label: string; icon: string; color: string } {
    const map: Record<string, { label: string; icon: string; color: string }> = {
      planning:  { label: 'Planning',  icon: 'edit_calendar',  color: '#667eea' },
      ongoing:   { label: 'Ongoing',   icon: 'flight_takeoff', color: '#38a169' },
      completed: { label: 'Completed', icon: 'check_circle',   color: '#718096' },
      cancelled: { label: 'Cancelled', icon: 'cancel',         color: '#e53e3e' },
    };
    return map[status] ?? { label: status, icon: 'help', color: '#a0aec0' };
  }

  getStatusCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: this.trips.length };
    for (const s of this.statuses) {
      counts[s] = this.trips.filter(t => t.status === s).length;
    }
    return counts;
  }

  formatDateRange(trip: Trip): string {
    if (!trip.start_date) return 'Dates TBD';
    const start = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!trip.end_date) return start;
    const end = new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} – ${end}`;
  }

  getDurationLabel(trip: Trip): string {
    const d = trip.duration_days;
    if (!d || d <= 0) return '';
    return d === 1 ? '1 day' : `${d} days`;
  }

  getPackingProgressColor(progress: number): string {
    if (progress >= 80) return 'primary';
    if (progress >= 40) return 'accent';
    return 'warn';
  }

  trackByTripId(_: number, trip: Trip): number { return trip.id; }
}