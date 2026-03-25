import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ItineraryService, Itinerary, ItineraryItem } from './itinerary';

const MOCK_ITEM: ItineraryItem = {
  id: 1, time: '09:00', activity: 'Visit Eiffel Tower',
  location: 'Paris', notes: 'Buy tickets in advance',
};

const MOCK_ITINERARY: Itinerary = {
  id: 1, name: 'Paris Trip',
  items: [MOCK_ITEM],
};

describe('ItineraryService', () => {
  let service: ItineraryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ItineraryService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItineraryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── createItinerary ──────────────────────────────────────────────────────
  it('createItinerary: should POST to /itineraries', () => {
    service.createItinerary({ name: 'Paris Trip' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries') && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'Paris Trip' });
    req.flush(MOCK_ITINERARY);
  });

  it('createItinerary: should return itinerary on success', () => {
    let result: Itinerary | undefined;
    service.createItinerary({ name: 'Paris Trip' }).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries') && r.method === 'POST');
    req.flush(MOCK_ITINERARY);
    expect(result?.name).toBe('Paris Trip');
  });

  // ── getItinerary ─────────────────────────────────────────────────────────
  it('getItinerary: should GET /itineraries/:id', () => {
    service.getItinerary(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries/1') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_ITINERARY);
  });

  it('getItinerary: should return itinerary with items', () => {
    let result: Itinerary | undefined;
    service.getItinerary(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries/1'));
    req.flush(MOCK_ITINERARY);
    expect(result?.items?.length).toBe(1);
    expect(result?.items?.[0].activity).toBe('Visit Eiffel Tower');
  });

  // ── updateItinerary ──────────────────────────────────────────────────────
  it('updateItinerary: should PUT to /itineraries/:id', () => {
    service.updateItinerary(1, { items: [MOCK_ITEM] }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries/1') && r.method === 'PUT');
    expect(req.request.method).toBe('PUT');
    req.flush(MOCK_ITINERARY);
  });

  it('updateItinerary: should send correct payload', () => {
    service.updateItinerary(1, { name: 'Updated' }).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries/1') && r.method === 'PUT');
    expect(req.request.body).toEqual({ name: 'Updated' });
    req.flush(MOCK_ITINERARY);
  });

  // ── deleteItineraryItem ──────────────────────────────────────────────────
  it('deleteItineraryItem: should DELETE /itineraries/:id/items/:itemId', () => {
    service.deleteItineraryItem(1, 2).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/itineraries/1/items/2') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Item deleted' });
  });
});
