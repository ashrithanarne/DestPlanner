import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard';
import { AnalyticsService, AnalyticsSummaryResponse, AnalyticsTripsResponse, AnalyticsExpensesResponse } from '../../services/analytics.service';

const MOCK_SUMMARY: AnalyticsSummaryResponse = {
  user_id: 1,
  summary: { total_trips: 2, total_spent: 2300, total_budgets: 2, average_spent_per_trip: 1150, countries_visited: 2 },
};

const MOCK_TRIPS: AnalyticsTripsResponse = {
  user_id: 1,
  total_trips: 2,
  trips: [
    { id: 1, trip_name: 'Paris Trip', destination: 'France', start_date: '2024-01-01', end_date: '2024-01-10', status: 'completed', total_cost: 1500 },
    { id: 2, trip_name: 'Tokyo Trip', destination: 'Japan', start_date: '2024-03-01', end_date: '2024-03-08', status: 'planning', total_cost: 800 },
  ],
};

const MOCK_EXPENSES: AnalyticsExpensesResponse = {
  user_id: 1,
  total_spent: 2300,
  categories: [
    { category: 'Accommodation', total_amount: 1300, count: 2 },
    { category: 'Food', total_amount: 700, count: 2 },
    { category: 'Transport', total_amount: 300, count: 1 },
  ],
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let router: Router;

  const mockAnalyticsService = {
    getSummary: vi.fn(() => of({ ...MOCK_SUMMARY })),
    getTrips: vi.fn(() => of({ ...MOCK_TRIPS })),
    getExpenses: vi.fn(() => of({ ...MOCK_EXPENSES })),
  };

  async function setup() {
    vi.clearAllMocks();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    mockAnalyticsService.getSummary.mockReturnValue(of({ ...MOCK_SUMMARY }));
    mockAnalyticsService.getTrips.mockReturnValue(of({ ...MOCK_TRIPS }));
    mockAnalyticsService.getExpenses.mockReturnValue(of({ ...MOCK_EXPENSES }));
    await setup();
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ──────────────────────────────────────────────────────────────
  it('ngOnInit: should call all three service methods', () => {
    expect(mockAnalyticsService.getSummary).toHaveBeenCalled();
    expect(mockAnalyticsService.getTrips).toHaveBeenCalled();
    expect(mockAnalyticsService.getExpenses).toHaveBeenCalled();
  });

  // ── loadSummary ───────────────────────────────────────────────────────────
  it('loadSummary: should populate summary on success', () => {
    expect(component.summary).not.toBeNull();
    expect(component.summary?.total_trips).toBe(2);
    expect(component.summary?.total_spent).toBe(2300);
    expect(component.summary?.countries_visited).toBe(2);
    expect(component.summary?.average_spent_per_trip).toBe(1150);
  });

  it('loadSummary: should set summaryLoading to false on success', () => {
    expect(component.summaryLoading).toBe(false);
  });

  it('loadSummary: should set summaryError on API failure', async () => {
    mockAnalyticsService.getSummary.mockReturnValue(throwError(() => new Error('fail')));
    await setup();
    expect(component.summaryError).toBeTruthy();
    expect(component.summaryLoading).toBe(false);
  });

  // ── loadTrips ─────────────────────────────────────────────────────────────
  it('loadTrips: should populate trips array on success', () => {
    expect(component.trips.length).toBe(2);
    expect(component.trips[0].trip_name).toBe('Paris Trip');
    expect(component.trips[1].trip_name).toBe('Tokyo Trip');
  });

  it('loadTrips: should populate trip fields correctly', () => {
    expect(component.trips[0].destination).toBe('France');
    expect(component.trips[0].status).toBe('completed');
    expect(component.trips[0].total_cost).toBe(1500);
  });

  it('loadTrips: should set tripsLoading to false on success', () => {
    expect(component.tripsLoading).toBe(false);
  });

  it('loadTrips: should set trips to empty array when none returned', async () => {
    mockAnalyticsService.getTrips.mockReturnValue(of({ user_id: 1, total_trips: 0, trips: [] }));
    await setup();
    expect(component.trips).toEqual([]);
  });

  it('loadTrips: should set tripsError on API failure', async () => {
    mockAnalyticsService.getTrips.mockReturnValue(throwError(() => new Error('fail')));
    await setup();
    expect(component.tripsError).toBeTruthy();
    expect(component.tripsLoading).toBe(false);
  });

  // ── loadExpenses ──────────────────────────────────────────────────────────
  it('loadExpenses: should populate categories on success', () => {
    expect(component.categories.length).toBe(3);
    expect(component.categories[0].category).toBe('Accommodation');
    expect(component.categories[1].category).toBe('Food');
  });

  it('loadExpenses: should set totalExpenseSpent on success', () => {
    expect(component.totalExpenseSpent).toBe(2300);
  });

  it('loadExpenses: should set expensesLoading to false on success', () => {
    expect(component.expensesLoading).toBe(false);
  });

  it('loadExpenses: should set categories to empty array when none returned', async () => {
    mockAnalyticsService.getExpenses.mockReturnValue(of({ user_id: 1, total_spent: 0, categories: [] }));
    await setup();
    expect(component.categories).toEqual([]);
    expect(component.totalExpenseSpent).toBe(0);
  });

  it('loadExpenses: should set expensesError on API failure', async () => {
    mockAnalyticsService.getExpenses.mockReturnValue(throwError(() => new Error('fail')));
    await setup();
    expect(component.expensesError).toBeTruthy();
    expect(component.expensesLoading).toBe(false);
  });

  // ── applyFilters ──────────────────────────────────────────────────────────
  it('applyFilters: should call getExpenses with selectedTripId', () => {
    component.selectedTripId = 1;
    component.applyFilters();
    expect(mockAnalyticsService.getExpenses).toHaveBeenCalledWith(1, undefined);
  });

  it('applyFilters: should call getExpenses with dateRange', () => {
    component.selectedDateRange = '2024-01-01,2024-01-31';
    component.applyFilters();
    expect(mockAnalyticsService.getExpenses).toHaveBeenCalledWith(undefined, '2024-01-01,2024-01-31');
  });

  it('applyFilters: should call getExpenses with both filters', () => {
    component.selectedTripId = 2;
    component.selectedDateRange = '2024-03-01,2024-03-31';
    component.applyFilters();
    expect(mockAnalyticsService.getExpenses).toHaveBeenCalledWith(2, '2024-03-01,2024-03-31');
  });

  // ── clearFilters ──────────────────────────────────────────────────────────
  it('clearFilters: should reset selectedTripId and selectedDateRange', () => {
    component.selectedTripId = 1;
    component.selectedDateRange = '2024-01-01,2024-01-31';
    component.clearFilters();
    expect(component.selectedTripId).toBeUndefined();
    expect(component.selectedDateRange).toBe('');
  });

  it('clearFilters: should reload expenses after clearing', () => {
    component.clearFilters();
    expect(mockAnalyticsService.getExpenses).toHaveBeenCalled();
  });

  // ── getBarWidth ───────────────────────────────────────────────────────────
  it('getBarWidth: should return correct percentage string', () => {
    component.totalExpenseSpent = 2300;
    expect(component.getBarWidth(1300)).toBe('57%');
    expect(component.getBarWidth(700)).toBe('30%');
    expect(component.getBarWidth(300)).toBe('13%');
  });

  it('getBarWidth: should return 0% when totalExpenseSpent is 0', () => {
    component.totalExpenseSpent = 0;
    expect(component.getBarWidth(500)).toBe('0%');
  });

  // ── navigateToTrip ────────────────────────────────────────────────────────
  it('navigateToTrip: should navigate to /my-trips', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.navigateToTrip(1);
    expect(spy).toHaveBeenCalledWith(['/my-trips']);
  });
});
