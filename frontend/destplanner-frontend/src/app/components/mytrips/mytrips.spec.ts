import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Router } from '@angular/router';

import { MyTripsComponent } from './mytrips';
import { TripService, Trip } from '../../services/trip.service';
import { BudgetService, BudgetSummary } from '../../services/budget';

const MOCK_TRIP: Trip = {
  id: 1,
  user_id: 1,
  trip_name: 'Hawaii Trip',
  destination: 'Hawaii',
  start_date: '2026-06-01T00:00:00Z',
  end_date: '2026-06-10T00:00:00Z',
  notes: 'Fun trip',
  status: 'planning',
  duration_days: 9,
  packing_progress: 50,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const MOCK_BUDGET: BudgetSummary = {
  id: 1, user_id: 1, trip_id: 1,
  trip_name: 'Hawaii Trip',
  total_budget: 2000, spent_amount: 500,
  remaining_budget: 1500, percentage_used: 25,
  currency: 'USD',
  created_at: '2026-03-01', updated_at: '2026-03-01',
};

const mockTripService = {
  trips$: new BehaviorSubject<Trip[]>([MOCK_TRIP]).asObservable(),
  getTrips: vi.fn(() => of({ trips: [MOCK_TRIP] })),
  getTripById: vi.fn(() => of(MOCK_TRIP)),
  createTrip: vi.fn(() => of({ message: 'Trip created', trip_id: 1 })),
  updateTrip: vi.fn(() => of({ message: 'Trip updated' })),
  deleteTrip: vi.fn(() => of({ message: 'Trip deleted' })),
};

const mockBudgetService = {
  budgets$: new BehaviorSubject<BudgetSummary[]>([MOCK_BUDGET]).asObservable(),
  selectedBudget$: new BehaviorSubject<BudgetSummary | null>(null).asObservable(),
  expenses$: new BehaviorSubject<any[]>([]).asObservable(),
  getBudgets: vi.fn(() => of({ budgets: [MOCK_BUDGET] })),
  getBudgetById: vi.fn(() => of(MOCK_BUDGET)),
  createBudget: vi.fn(() => of({ message: 'ok', budget_id: 1 })),
  updateBudget: vi.fn(() => of({ message: 'ok' })),
  deleteBudget: vi.fn(() => of({ message: 'ok' })),
  addExpense: vi.fn(() => of({ message: 'ok', expense_id: 1 })),
  getExpenses: vi.fn(() => of({ expenses: [] })),
  updateExpense: vi.fn(() => of({ message: 'ok' })),
  deleteExpense: vi.fn(() => of({ message: 'ok' })),
  getCategoryTotals: vi.fn(() => []),
  getSpentPercentage: vi.fn(() => 25),
  setSelectedBudget: vi.fn(),
  updateLocalSummary: vi.fn(),
};

describe('MyTripsComponent', () => {
  let component: MyTripsComponent;
  let fixture: ComponentFixture<MyTripsComponent>;
  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTripService.getTrips.mockReturnValue(of({ trips: [MOCK_TRIP] }));
    mockBudgetService.getBudgets.mockReturnValue(of({ budgets: [MOCK_BUDGET] }));

    await TestBed.configureTestingModule({
      imports: [MyTripsComponent],
      providers: [
        { provide: TripService, useValue: mockTripService },
        { provide: BudgetService, useValue: mockBudgetService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: MyTripsComponent },
          { path: 'budget', component: MyTripsComponent },
          { path: 'timeline/:tripId', component: MyTripsComponent },
        ]),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTripsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit: should load trips on init', () => {
    expect(mockTripService.getTrips).toHaveBeenCalled();
  });

  it('ngOnInit: should load budgets on init', () => {
    expect(mockBudgetService.getBudgets).toHaveBeenCalled();
  });

  it('loadTrips: should populate trips array', async () => {
    await fixture.whenStable();
    expect(component.trips.length).toBe(1);
    expect(component.trips[0].trip_name).toBe('Hawaii Trip');
  });


  it('applyFilter: should filter trips by status', () => {
    component.trips = [
      { ...MOCK_TRIP, id: 1, status: 'planning' },
      { ...MOCK_TRIP, id: 2, status: 'completed' },
    ];
    component.applyFilter('planning');
    expect(component.filteredTrips.length).toBe(1);
    expect(component.filteredTrips[0].status).toBe('planning');
  });

  it('applyFilter: should show all trips for "all" filter', () => {
    component.trips = [
      { ...MOCK_TRIP, id: 1, status: 'planning' },
      { ...MOCK_TRIP, id: 2, status: 'completed' },
    ];
    component.applyFilter('all');
    expect(component.filteredTrips.length).toBe(2);
  });

  it('toggleCreateForm: should toggle showCreateForm', () => {
    component.toggleCreateForm();
    expect(component.showCreateForm).toBe(true);
    component.toggleCreateForm();
    expect(component.showCreateForm).toBe(false);
  });

  it('submitCreate: should not call createTrip if form is invalid', () => {
    component.createForm.reset();
    component.submitCreate();
    expect(mockTripService.createTrip).not.toHaveBeenCalled();
  });

  it('submitCreate: should call createTrip with form values', async () => {
    component.createForm.setValue({
      trip_name: 'New Trip',
      destination: 'Tokyo',
      start_date: '2026-09-01',
      end_date: '2026-09-10',
      notes: 'Fun',
    });
    component.submitCreate();
    await fixture.whenStable();
    expect(mockTripService.createTrip).toHaveBeenCalledWith(
      expect.objectContaining({ trip_name: 'New Trip', destination: 'Tokyo' })
    );
  });

  it('submitCreate: should reset form and close after success', async () => {
    component.createForm.setValue({
      trip_name: 'New Trip', destination: 'Tokyo',
      start_date: '', end_date: '', notes: '',
    });
    component.submitCreate();
    await fixture.whenStable();
    expect(component.showCreateForm).toBe(false);
    expect(component.savingTrip).toBe(false);
  });

  it('startEdit: should set editingTrip and patch form', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');
    component.startEdit(MOCK_TRIP, event);
    expect(component.editingTrip).toEqual(MOCK_TRIP);
    expect(component.editForm.value.trip_name).toBe('Hawaii Trip');
    expect(component.editForm.value.status).toBe('planning');
  });

  it('cancelEdit: should clear editingTrip', () => {
    component.editingTrip = MOCK_TRIP;
    component.cancelEdit();
    expect(component.editingTrip).toBeNull();
  });

  it('submitEdit: should not call updateTrip if no editingTrip', () => {
    component.editingTrip = null;
    component.submitEdit();
    expect(mockTripService.updateTrip).not.toHaveBeenCalled();
  });

  it('submitEdit: should call updateTrip with correct payload', async () => {
    component.editingTrip = MOCK_TRIP;
    component.editForm.setValue({
      trip_name: 'Updated Trip', destination: 'Tokyo',
      start_date: '', end_date: '', notes: '', status: 'ongoing',
    });
    component.submitEdit();
    await fixture.whenStable();
    expect(mockTripService.updateTrip).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ trip_name: 'Updated Trip', status: 'ongoing' })
    );
  });

  it('submitEdit: should clear editingTrip after success', async () => {
    component.editingTrip = MOCK_TRIP;
    component.editForm.setValue({
      trip_name: 'Updated Trip', destination: '',
      start_date: '', end_date: '', notes: '', status: 'ongoing',
    });
    component.submitEdit();
    await fixture.whenStable();
    expect(component.editingTrip).toBeNull();
    expect(component.savingTrip).toBe(false);
  });

  it('deleteTrip: should call deleteTrip on service after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const event = new MouseEvent('click');
    component.deleteTrip(MOCK_TRIP, event);
    await fixture.whenStable();
    expect(mockTripService.deleteTrip).toHaveBeenCalledWith(1);
  });

  it('deleteTrip: should not call deleteTrip if confirm cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const event = new MouseEvent('click');
    component.deleteTrip(MOCK_TRIP, event);
    expect(mockTripService.deleteTrip).not.toHaveBeenCalled();
  });

  it('openBudget: should navigate to /budget with trip_id', () => {
    const spy = vi.spyOn(router, 'navigate');
    const event = new MouseEvent('click');
    component.openBudget(MOCK_TRIP, event);
    expect(spy).toHaveBeenCalledWith(['/budget'], { queryParams: { trip_id: 1 } });
  });

  // ──  openTimeline ─────────────────────────────────────────────────

  it('openTimeline: should navigate to /timeline/:id', () => {
    const spy = vi.spyOn(router, 'navigate');
    const event = new MouseEvent('click');
    component.openTimeline(7, event);
    expect(spy).toHaveBeenCalledWith(['/timeline', 7]);
  });

  it('openTimeline: should stop event propagation', () => {
    const event = new MouseEvent('click');
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    component.openTimeline(MOCK_TRIP.id, event);
    expect(stopSpy).toHaveBeenCalled();
  });

  // ── Status helpers ─────────────────────────────────────────────────────────

  it('getStatusConfig: should return correct config for planning', () => {
    const config = component.getStatusConfig('planning');
    expect(config.label).toBe('Planning');
    expect(config.icon).toBe('edit_calendar');
  });

  it('getStatusConfig: should return correct config for completed', () => {
    const config = component.getStatusConfig('completed');
    expect(config.label).toBe('Completed');
    expect(config.icon).toBe('check_circle');
  });

  it('getStatusConfig: should return fallback for unknown status', () => {
    const config = component.getStatusConfig('unknown');
    expect(config.label).toBe('unknown');
  });

  it('getStatusCounts: should return correct counts', () => {
    component.trips = [
      { ...MOCK_TRIP, id: 1, status: 'planning' },
      { ...MOCK_TRIP, id: 2, status: 'planning' },
      { ...MOCK_TRIP, id: 3, status: 'completed' },
    ];
    const counts = component.getStatusCounts();
    expect(counts['all']).toBe(3);
    expect(counts['planning']).toBe(2);
    expect(counts['completed']).toBe(1);
  });

  it('formatDateRange: should return "Dates TBD" if no start date', () => {
    const trip = { ...MOCK_TRIP, start_date: undefined };
    expect(component.formatDateRange(trip)).toBe('Dates TBD');
  });

  it('formatDateRange: should return formatted date range', () => {
    const result = component.formatDateRange(MOCK_TRIP);
    expect(result).toContain('2026');
  });

  it('getDurationLabel: should return empty string if no duration', () => {
    const trip = { ...MOCK_TRIP, duration_days: undefined };
    expect(component.getDurationLabel(trip)).toBe('');
  });

  it('getDurationLabel: should return "1 day" for single day', () => {
    const trip = { ...MOCK_TRIP, duration_days: 1 };
    expect(component.getDurationLabel(trip)).toBe('1 day');
  });

  it('getDurationLabel: should return "N days" for multiple days', () => {
    const trip = { ...MOCK_TRIP, duration_days: 9 };
    expect(component.getDurationLabel(trip)).toBe('9 days');
  });

  it('getPackingProgressColor: should return primary for >= 80', () => {
    expect(component.getPackingProgressColor(80)).toBe('primary');
  });

  it('getPackingProgressColor: should return accent for 40-79', () => {
    expect(component.getPackingProgressColor(50)).toBe('accent');
  });

  it('getPackingProgressColor: should return warn for < 40', () => {
    expect(component.getPackingProgressColor(20)).toBe('warn');
  });

  it('trackByTripId: should return trip id', () => {
    expect(component.trackByTripId(0, MOCK_TRIP)).toBe(1);
  });
});