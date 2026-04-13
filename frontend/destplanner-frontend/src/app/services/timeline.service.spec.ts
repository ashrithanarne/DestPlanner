import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  TimelineService,
  TimelineResponse,
  CreateTimelineItemPayload,
} from './timeline.service';

describe('TimelineService', () => {
  let service: TimelineService;
  let httpMock: HttpTestingController;
  const BASE = 'http://localhost:8080/api';

  const mockTimeline = (): TimelineResponse => ({
    trip_id: 1,
    trip_name: 'Paris Trip',
    start_date: '2026-06-01',
    days: [{ date: '2026-06-01', day_number: 1, items: [] }],
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TimelineService],
    });
    service = TestBed.inject(TimelineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── getTimeline ───────────────────────────────────────────────────────

  it('getTimeline: should GET /trips/:id/timeline', () => {
    service.getTimeline(1).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTimeline());
  });

  it('getTimeline: should update timeline$', () => {
    service.getTimeline(1).subscribe();
    httpMock.expectOne(`${BASE}/trips/1/timeline`).flush(mockTimeline());
    service.timeline$.subscribe(t => expect(t?.trip_name).toBe('Paris Trip'));
  });

  it('getTimeline: should return days array from response', () => {
    service.getTimeline(1).subscribe(res => expect(res.days.length).toBe(1));
    httpMock.expectOne(`${BASE}/trips/1/timeline`).flush(mockTimeline());
  });

  it('getTimeline: should use correct tripId in URL', () => {
    service.getTimeline(42).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/42/timeline`);
    expect(req.request.url).toContain('/42/');
    req.flush(mockTimeline());
  });

  // ── createItem ────────────────────────────────────────────────────────

  it('createItem: should POST to /trips/:id/timeline/items', () => {
    const payload: CreateTimelineItemPayload = {
      title: 'Eiffel Tower',
      activity_type: 'activity',
      date: '2026-06-01',
    };
    service.createItem(1, payload).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ item_id: 42 });
  });

  it('createItem: should return item_id in response', () => {
    const payload: CreateTimelineItemPayload = {
      title: 'Lunch',
      activity_type: 'dining',
      date: '2026-06-01',
    };
    service.createItem(1, payload).subscribe(res => expect(res.item_id).toBe(99));
    httpMock.expectOne(`${BASE}/trips/1/timeline/items`).flush({ item_id: 99 });
  });

  it('createItem: should send optional fields when provided', () => {
    const payload: CreateTimelineItemPayload = {
      title: 'Hotel Check-in',
      activity_type: 'accommodation',
      date: '2026-06-01',
      start_time: '14:00',
      location: 'Paris',
      description: 'Check in at 2pm',
    };
    service.createItem(1, payload).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items`);
    expect(req.request.body.location).toBe('Paris');
    req.flush({ item_id: 5 });
  });

  // ── updateItem ────────────────────────────────────────────────────────

  it('updateItem: should PUT /trips/:id/timeline/items/:itemId', () => {
    service.updateItem(1, 5, { title: 'Updated Title' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'Updated Title' });
    req.flush({});
  });

  it('updateItem: should allow partial payload with only location', () => {
    service.updateItem(1, 5, { location: 'Rome' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/5`);
    expect(req.request.body).toEqual({ location: 'Rome' });
    req.flush({});
  });

  it('updateItem: should use correct itemId in URL', () => {
    service.updateItem(1, 99, { title: 'X' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/99`);
    expect(req.request.url).toContain('/99');
    req.flush({});
  });

  // ── deleteItem ────────────────────────────────────────────────────────

  it('deleteItem: should DELETE /trips/:id/timeline/items/:itemId', () => {
    service.deleteItem(1, 7).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('deleteItem: should use correct tripId and itemId', () => {
    service.deleteItem(5, 12).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/5/timeline/items/12`);
    expect(req.request.url).toContain('/trips/5/timeline/items/12');
    req.flush({});
  });

  // ── reorderItem ───────────────────────────────────────────────────────

  it('reorderItem: should PUT /trips/:id/timeline/items/:itemId/reorder', () => {
    service.reorderItem(1, 3, { date: '2026-06-02', new_position: 2 }).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/3/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ date: '2026-06-02', new_position: 2 });
    req.flush({});
  });

  it('reorderItem: should send new_position in body', () => {
    service.reorderItem(1, 3, { date: '2026-06-01', new_position: 5 }).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/1/timeline/items/3/reorder`);
    expect(req.request.body.new_position).toBe(5);
    req.flush({});
  });

  // ── setTimeline ───────────────────────────────────────────────────────

  it('setTimeline: should update timeline$ directly', () => {
    const data = mockTimeline();
    service.setTimeline(data);
    service.timeline$.subscribe(t => expect(t).toEqual(data));
  });

  it('setTimeline: should allow setting null', () => {
    service.setTimeline(null);
    service.timeline$.subscribe(t => expect(t).toBeNull());
  });

  // ── getActivityColor ──────────────────────────────────────────────────

  it('getActivityColor: should return blue (#3b82f6) for travel', () => {
    expect(service.getActivityColor('travel')).toBe('#3b82f6');
  });

  it('getActivityColor: should return purple (#8b5cf6) for accommodation', () => {
    expect(service.getActivityColor('accommodation')).toBe('#8b5cf6');
  });

  it('getActivityColor: should return green (#10b981) for activity', () => {
    expect(service.getActivityColor('activity')).toBe('#10b981');
  });

  it('getActivityColor: should return amber (#f59e0b) for dining', () => {
    expect(service.getActivityColor('dining')).toBe('#f59e0b');
  });

  it('getActivityColor: should return gray (#6b7280) for other', () => {
    expect(service.getActivityColor('other')).toBe('#6b7280');
  });

  // ── getActivityIcon ───────────────────────────────────────────────────

  it('getActivityIcon: should return flight for travel', () => {
    expect(service.getActivityIcon('travel')).toBe('flight');
  });

  it('getActivityIcon: should return hotel for accommodation', () => {
    expect(service.getActivityIcon('accommodation')).toBe('hotel');
  });

  it('getActivityIcon: should return hiking for activity', () => {
    expect(service.getActivityIcon('activity')).toBe('hiking');
  });

  it('getActivityIcon: should return restaurant for dining', () => {
    expect(service.getActivityIcon('dining')).toBe('restaurant');
  });

  it('getActivityIcon: should return event for other', () => {
    expect(service.getActivityIcon('other')).toBe('event');
  });
});
