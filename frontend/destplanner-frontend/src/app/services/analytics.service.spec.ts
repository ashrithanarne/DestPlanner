import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ─────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  it('getSummary: should GET /analytics/summary', () => {
    service.getSummary().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/summary') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush({ user_id: 1, summary: { total_trips: 0, total_spent: 0, total_budgets: 0, average_spent_per_trip: 0, countries_visited: 0 } });
  });

  it('getSummary: should return summary with all required fields', () => {
    const mockResponse = {
      user_id: 1,
      summary: {
        total_trips: 5,
        total_spent: 3500,
        total_budgets: 4,
        average_spent_per_trip: 700,
        countries_visited: 3,
      },
    };
    let result: any;
    service.getSummary().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/summary'));
    req.flush(mockResponse);
    expect(result.summary.total_trips).toBe(5);
    expect(result.summary.total_spent).toBe(3500);
    expect(result.summary.countries_visited).toBe(3);
    expect(result.summary.average_spent_per_trip).toBe(700);
  });

  it('getSummary: should propagate HTTP 401 when not authenticated', () => {
    let error: any;
    service.getSummary().subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/analytics/summary')).flush(
      { error: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );
    expect(error.status).toBe(401);
  });

  it('getSummary: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getSummary().subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/analytics/summary')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });

  // ── getTrips ──────────────────────────────────────────────────────────────

  it('getTrips: should GET /analytics/trips', () => {
    service.getTrips().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/trips') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush({ user_id: 1, total_trips: 0, trips: [] });
  });

  it('getTrips: should return trips with required fields', () => {
    const mockResponse = {
      user_id: 1,
      total_trips: 2,
      trips: [
        { id: 1, trip_name: 'Paris Trip', destination: 'France', start_date: '2024-01-01', end_date: '2024-01-10', status: 'completed', total_cost: 1500 },
        { id: 2, trip_name: 'Tokyo Trip', destination: 'Japan', start_date: '2024-03-01', end_date: '2024-03-08', status: 'planning', total_cost: 800 },
      ],
    };
    let result: any;
    service.getTrips().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/trips'));
    req.flush(mockResponse);
    expect(result.total_trips).toBe(2);
    expect(result.trips[0].trip_name).toBe('Paris Trip');
    expect(result.trips[0].destination).toBe('France');
    expect(result.trips[0].status).toBe('completed');
    expect(result.trips[0].total_cost).toBe(1500);
    expect(result.trips[1].trip_name).toBe('Tokyo Trip');
  });

  it('getTrips: should return empty trips array when no trips exist', () => {
    let result: any;
    service.getTrips().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/trips'));
    req.flush({ user_id: 1, total_trips: 0, trips: [] });
    expect(result.trips).toEqual([]);
    expect(result.total_trips).toBe(0);
  });

  it('getTrips: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getTrips().subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/analytics/trips')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });

  // ── getExpenses — no filters ──────────────────────────────────────────────

  it('getExpenses: should GET /analytics/expenses with no filters', () => {
    service.getExpenses().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/expenses') && r.method === 'GET');
    expect(req.request.url).not.toContain('tripId');
    expect(req.request.url).not.toContain('dateRange');
    req.flush({ user_id: 1, total_spent: 0, categories: [] });
  });

  it('getExpenses: should return categories with required fields', () => {
    const mockResponse = {
      user_id: 1,
      total_spent: 2300,
      categories: [
        { category: 'Accommodation', total_amount: 1300, count: 2 },
        { category: 'Food', total_amount: 700, count: 2 },
        { category: 'Transport', total_amount: 300, count: 1 },
      ],
    };
    let result: any;
    service.getExpenses().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/expenses'));
    req.flush(mockResponse);
    expect(result.total_spent).toBe(2300);
    expect(result.categories.length).toBe(3);
    expect(result.categories[0].category).toBe('Accommodation');
    expect(result.categories[0].total_amount).toBe(1300);
    expect(result.categories[0].count).toBe(2);
  });

  // ── getExpenses — with tripId filter ─────────────────────────────────────

  it('getExpenses: should include tripId param when provided', () => {
    service.getExpenses(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/analytics/expenses') && r.url.includes('tripId=1'));
    expect(req.request.method).toBe('GET');
    req.flush({ user_id: 1, total_spent: 1500, categories: [] });
  });

  it('getExpenses: should return filtered data when tripId is provided', () => {
    let result: any;
    service.getExpenses(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('tripId=1'));
    req.flush({ user_id: 1, total_spent: 1500, categories: [{ category: 'Accommodation', total_amount: 800, count: 1 }] });
    expect(result.total_spent).toBe(1500);
    expect(result.categories[0].category).toBe('Accommodation');
  });

  // ── getExpenses — with dateRange filter ───────────────────────────────────

  it('getExpenses: should include dateRange param when provided', () => {
    service.getExpenses(undefined, '2024-01-01,2024-01-31').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/analytics/expenses') && r.url.includes('dateRange=2024-01-01,2024-01-31')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ user_id: 1, total_spent: 1500, categories: [] });
  });

  it('getExpenses: should include both tripId and dateRange when both provided', () => {
    service.getExpenses(2, '2024-03-01,2024-03-31').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('tripId=2') && r.url.includes('dateRange=2024-03-01,2024-03-31')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ user_id: 1, total_spent: 800, categories: [] });
  });

  it('getExpenses: should return empty categories when no expenses match filter', () => {
    let result: any;
    service.getExpenses(99).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('tripId=99'));
    req.flush({ user_id: 1, total_spent: 0, categories: [] });
    expect(result.categories).toEqual([]);
    expect(result.total_spent).toBe(0);
  });

  it('getExpenses: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getExpenses().subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/analytics/expenses')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });
});
