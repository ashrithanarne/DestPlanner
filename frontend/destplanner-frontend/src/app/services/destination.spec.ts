import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DestinationService, Destination } from './destination';

const MOCK_DESTINATIONS: Destination[] = [
  { id: 1, name: 'Paris', country: 'France', budget: 2000, description: 'City of Lights' },
  { id: 2, name: 'Tokyo', country: 'Japan', budget: 3000, description: 'City of Technology' },
];

describe('DestinationService', () => {
  let service: DestinationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DestinationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DestinationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getDestinations — no filters ─────────────────────────────────────────
  it('getDestinations: should GET /auth/destinations with no filters', () => {
    service.getDestinations().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations') && r.method === 'GET');
    expect(req.request.url).not.toContain('?');
    req.flush(MOCK_DESTINATIONS);
  });

  it('getDestinations: should return array of destinations', () => {
    let result: Destination[] = [];
    service.getDestinations().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations'));
    req.flush(MOCK_DESTINATIONS);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Paris');
  });

  // ── getDestinations — with budget filter ─────────────────────────────────
  it('getDestinations: should include budget param when provided', () => {
    service.getDestinations(2000).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations') && r.url.includes('budget=2000'));
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_DESTINATIONS);
  });

  // ── getDestinations — with country filter ────────────────────────────────
  it('getDestinations: should include country param when provided', () => {
    service.getDestinations(undefined, 'France').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('country=France'));
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_DESTINATIONS[0]]);
  });

  // ── getDestinations — with both filters ──────────────────────────────────
  it('getDestinations: should include both params when provided', () => {
    service.getDestinations(2000, 'France').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('budget=2000') && r.url.includes('country=France')
    );
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_DESTINATIONS[0]]);
  });

  // ── getDestinationById ───────────────────────────────────────────────────
  it('getDestinationById: should GET /auth/destinations/:id', () => {
    service.getDestinationById(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations/1') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_DESTINATIONS[0]);
  });

  it('getDestinationById: should return the destination', () => {
    let result: Destination | undefined;
    service.getDestinationById(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations/1'));
    req.flush(MOCK_DESTINATIONS[0]);
    expect(result?.name).toBe('Paris');
    expect(result?.country).toBe('France');
  });

  // ── suggestDestinations ──────────────────────────────────────────────────
  it('suggestDestinations: should GET /auth/destinations/suggest?q=', () => {
    service.suggestDestinations('par').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/auth/destinations/suggest') && r.url.includes('q=par'));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Paris' }]);
  });

  it('suggestDestinations: should return suggestions array', () => {
    let result: { id: number; name: string }[] = [];
    service.suggestDestinations('tok').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('suggest'));
    req.flush([{ id: 2, name: 'Tokyo' }]);
    expect(result[0].name).toBe('Tokyo');
  });

  // ── getDestinationsByCategory ─────────────────────────────────────────────

  it('getDestinationsByCategory: should GET /auth/destinations?category=friends', () => {
    service.getDestinationsByCategory('friends').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/auth/destinations') && r.url.includes('category=friends')
    );
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_DESTINATIONS);
  });

  it('getDestinationsByCategory: should URL-encode the category value', () => {
    service.getDestinationsByCategory('Trip with Friends').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('category=Trip%20with%20Friends')
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getDestinationsByCategory: should return matching destinations', () => {
    let result: Destination[] = [];
    service.getDestinationsByCategory('couples').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('category=couples'));
    req.flush(MOCK_DESTINATIONS);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Paris');
  });

  it('getDestinationsByCategory: should return empty array when no match', () => {
    let result: Destination[] = [];
    service.getDestinationsByCategory('solo').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('category=solo'));
    req.flush([]);
    expect(result).toEqual([]);
  });

  it('getDestinationsByCategory: should propagate HTTP errors', () => {
    let error: any;
    service.getDestinationsByCategory('adventure').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('category=adventure')).flush(
      { error: 'server error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });
});