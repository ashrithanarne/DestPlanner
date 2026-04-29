import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  AnalyticsService,
  AnalyticsSummary,
  AnalyticsTrip,
  AnalyticsExpenseCategory,
} from '../../services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  summary: AnalyticsSummary | null = null;
  trips: AnalyticsTrip[] = [];
  categories: AnalyticsExpenseCategory[] = [];
  totalExpenseSpent = 0;

  summaryLoading = true;
  tripsLoading = true;
  expensesLoading = true;

  summaryError = '';
  tripsError = '';
  expensesError = '';

  selectedTripId: number | undefined = undefined;
  selectedDateRange = '';

  constructor(
    private analyticsService: AnalyticsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadTrips();
    this.loadExpenses();
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.summaryError = '';
    this.analyticsService.getSummary().subscribe({
      next: (res) => {
        this.summary = res.summary;
        this.summaryLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.summaryError = 'Failed to load summary.';
        this.summaryLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadTrips(): void {
    this.tripsLoading = true;
    this.tripsError = '';
    this.analyticsService.getTrips().subscribe({
      next: (res) => {
        this.trips = res.trips || [];
        this.tripsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.tripsError = 'Failed to load trips.';
        this.tripsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadExpenses(): void {
    this.expensesLoading = true;
    this.expensesError = '';
    this.analyticsService.getExpenses(this.selectedTripId, this.selectedDateRange || undefined).subscribe({
      next: (res) => {
        this.categories = res.categories || [];
        this.totalExpenseSpent = res.total_spent || 0;
        this.expensesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.expensesError = 'Failed to load expense data.';
        this.expensesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.loadExpenses();
  }

  clearFilters(): void {
    this.selectedTripId = undefined;
    this.selectedDateRange = '';
    this.loadExpenses();
  }

  getBarWidth(amount: number): string {
    if (!this.totalExpenseSpent || this.totalExpenseSpent === 0) return '0%';
    return Math.round((amount / this.totalExpenseSpent) * 100) + '%';
  }

  navigateToTrip(tripId: number): void {
    this.router.navigate(['/my-trips']);
  }
}
