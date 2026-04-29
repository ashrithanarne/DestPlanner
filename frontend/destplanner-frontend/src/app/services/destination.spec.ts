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

  // ── compareDestinations ───────────────────────────────────────────────────

  it('compareDestinations: should GET /destinations/compare?ids=1,2', () => {
    service.compareDestinations([1, 2]).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/destinations/compare') && r.url.includes('ids=1,2')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ total_destinations: 2, destinations: [] });
  });

  it('compareDestinations: should include all ids in query param', () => {
    service.compareDestinations([1, 2, 3]).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('ids=1,2,3'));
    expect(req.request.method).toBe('GET');
    req.flush({ total_destinations: 3, destinations: [] });
  });

  it('compareDestinations: should return CompareResponse with destinations', () => {
    const mockResponse = {
      total_destinations: 2,
      destinations: [
        { id: 1, name: 'Paris', country: 'France', budget: 2000, description: 'City of Light', best_season: 'Spring', travel_time: '2h flight', activities: ['Eiffel Tower'] },
        { id: 2, name: 'Tokyo', country: 'Japan', budget: 3000, description: 'Rising Sun', best_season: 'Autumn', travel_time: '14h flight', activities: [] },
      ],
    };
    let result: any;
    service.compareDestinations([1, 2]).subscribe(r => result = r);
    const req = httpMock.expectOne((r) => r.url.includes('/destinations/compare'));
    req.flush(mockResponse);
    expect(result.total_destinations).toBe(2);
    expect(result.destinations[0].name).toBe('Paris');
    expect(result.destinations[0].best_season).toBe('Spring');
    expect(result.destinations[0].travel_time).toBe('2h flight');
    expect(result.destinations[0].activities).toEqual(['Eiffel Tower']);
  });

  it('compareDestinations: should propagate HTTP errors', () => {
    let error: any;
    service.compareDestinations([1, 2]).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/compare')).flush(
      { error: 'not found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  // ── getActivities ─────────────────────────────────────────────────────────

  it('getActivities: should GET /destinations/:id/activities', () => {
    service.getActivities(1).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/public/destinations/1/activities') && r.method === 'GET'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 1, total_activities: 0, activities: [] });
  });

  it('getActivities: should use the correct destination id in the URL', () => {
    service.getActivities(42).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/42/activities'));
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 42, total_activities: 0, activities: [] });
  });

  it('getActivities: should return activities list with name and description', () => {
    const mockResponse = {
      destination_id: 1,
      total_activities: 2,
      activities: [
        { id: 1, destination_id: 1, name: 'Eiffel Tower', description: 'Iconic tower', category: 'Sightseeing', created_at: '', updated_at: '' },
        { id: 2, destination_id: 1, name: 'Louvre Museum', description: 'World famous museum', category: 'Culture', created_at: '', updated_at: '' },
      ],
    };
    let result: any;
    service.getActivities(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/activities'));
    req.flush(mockResponse);
    expect(result.total_activities).toBe(2);
    expect(result.activities[0].name).toBe('Eiffel Tower');
    expect(result.activities[0].description).toBe('Iconic tower');
    expect(result.activities[0].category).toBe('Sightseeing');
    expect(result.activities[1].name).toBe('Louvre Museum');
  });

  it('getActivities: should return empty activities array when none exist', () => {
    let result: any;
    service.getActivities(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/activities'));
    req.flush({ destination_id: 1, total_activities: 0, activities: [] });
    expect(result.activities).toEqual([]);
    expect(result.total_activities).toBe(0);
  });

  it('getActivities: should propagate HTTP 404 when destination not found', () => {
    let error: any;
    service.getActivities(999).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/999/activities')).flush(
      { error: 'not_found', message: 'Destination not found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  it('getActivities: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getActivities(1).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/1/activities')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });

  // ── getTravelOptions ───────────────────────────────────────────────────

  it('getTravelOptions: should GET /auth/destinations/:id/travel', () => {
    service.getTravelOptions(1).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/public/destinations/1/travel') && r.method === 'GET'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 1, destination_name: 'Paris', total_options: 0, travel_options: [] });
  });

  it('getTravelOptions: should use the correct destination id in the URL', () => {
    service.getTravelOptions(5).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/5/travel'));
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 5, destination_name: 'Tokyo', total_options: 0, travel_options: [] });
  });

  it('getTravelOptions: should return travel options with required fields', () => {
    const mockResponse = {
      destination_id: 1,
      destination_name: 'Paris',
      total_options: 2,
      travel_options: [
        { id: 1, type: 'Flight', name: 'Direct Flight to Paris', description: 'Round trip', estimated_cost: 450, currency: 'USD', booking_link: 'https://skyscanner.com' },
        { id: 2, type: 'Train', name: 'Express Train to Paris', description: 'High speed rail', estimated_cost: 120, currency: 'USD', booking_link: 'https://raileurope.com' },
      ],
    };
    let result: any;
    service.getTravelOptions(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/travel'));
    req.flush(mockResponse);
    expect(result.total_options).toBe(2);
    expect(result.travel_options[0].name).toBe('Direct Flight to Paris');
    expect(result.travel_options[0].type).toBe('Flight');
    expect(result.travel_options[0].estimated_cost).toBe(450);
    expect(result.travel_options[0].booking_link).toBe('https://skyscanner.com');
    expect(result.travel_options[1].type).toBe('Train');
  });

  it('getTravelOptions: should propagate HTTP 404 when destination not found', () => {
    let error: any;
    service.getTravelOptions(999).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/999/travel')).flush(
      { error: 'not_found', message: 'Destination not found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  it('getTravelOptions: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getTravelOptions(1).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/1/travel')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });

  // ── getAccommodationOptions ──────────────────────────────────────────

  it('getAccommodationOptions: should GET /auth/destinations/:id/accommodations', () => {
    service.getAccommodationOptions(1).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/public/destinations/1/accommodations') && r.method === 'GET'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 1, destination_name: 'Paris', total_options: 0, accommodation_options: [] });
  });

  it('getAccommodationOptions: should use the correct destination id in the URL', () => {
    service.getAccommodationOptions(7).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/7/accommodations'));
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 7, destination_name: 'Bali', total_options: 0, accommodation_options: [] });
  });

  it('getAccommodationOptions: should return accommodation options with required fields', () => {
    const mockResponse = {
      destination_id: 1,
      destination_name: 'Paris',
      total_options: 2,
      accommodation_options: [
        { id: 1, name: 'Luxury Hotel Paris', type: 'Hotel', description: '5-star hotel', estimated_cost: 350, currency: 'USD', booking_link: 'https://booking.com' },
        { id: 2, name: 'Budget Hostel Paris', type: 'Hostel', description: 'Clean hostel', estimated_cost: 30, currency: 'USD', booking_link: 'https://hostelworld.com' },
      ],
    };
    let result: any;
    service.getAccommodationOptions(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/accommodations'));
    req.flush(mockResponse);
    expect(result.total_options).toBe(2);
    expect(result.accommodation_options[0].name).toBe('Luxury Hotel Paris');
    expect(result.accommodation_options[0].type).toBe('Hotel');
    expect(result.accommodation_options[0].estimated_cost).toBe(350);
    expect(result.accommodation_options[0].booking_link).toBe('https://booking.com');
    expect(result.accommodation_options[1].type).toBe('Hostel');
  });

  it('getAccommodationOptions: should propagate HTTP 404 when destination not found', () => {
    let error: any;
    service.getAccommodationOptions(999).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/999/accommodations')).flush(
      { error: 'not_found', message: 'Destination not found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  it('getAccommodationOptions: should propagate HTTP 500 on server error', () => {
    let error: any;
    service.getAccommodationOptions(1).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/1/accommodations')).flush(
      { error: 'server_error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    expect(error.status).toBe(500);
  });

  // ── getReviews ────────────────────────────────────────────────────────────

  it('getReviews: should GET /auth/destinations/:id/reviews', () => {
    service.getReviews(1).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/public/destinations/1/reviews') && r.method === 'GET'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 1, average_rating: 0, total_reviews: 0, reviews: [] });
  });

  it('getReviews: should use the correct destination id in the URL', () => {
    service.getReviews(5).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/5/reviews'));
    expect(req.request.method).toBe('GET');
    req.flush({ destination_id: 5, average_rating: 0, total_reviews: 0, reviews: [] });
  });

  it('getReviews: should return reviews with reviewer_name, rating, comment', () => {
    const mockResponse = {
      destination_id: 1,
      average_rating: 4.5,
      total_reviews: 2,
      reviews: [
        { id: 1, destination_id: 1, user_id: 1, reviewer_name: 'Alice Smith', rating: 5, comment: 'Amazing!', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 2, destination_id: 1, user_id: 2, reviewer_name: 'Bob Jones', rating: 4, comment: 'Great place', created_at: '2024-01-02', updated_at: '2024-01-02' },
      ],
    };
    let result: any;
    service.getReviews(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/reviews'));
    req.flush(mockResponse);
    expect(result.total_reviews).toBe(2);
    expect(result.average_rating).toBe(4.5);
    expect(result.reviews[0].reviewer_name).toBe('Alice Smith');
    expect(result.reviews[0].rating).toBe(5);
    expect(result.reviews[0].comment).toBe('Amazing!');
    expect(result.reviews[1].reviewer_name).toBe('Bob Jones');
  });

  it('getReviews: should return empty reviews array when none exist', () => {
    let result: any;
    service.getReviews(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/public/destinations/1/reviews'));
    req.flush({ destination_id: 1, average_rating: 0, total_reviews: 0, reviews: [] });
    expect(result.reviews).toEqual([]);
    expect(result.total_reviews).toBe(0);
    expect(result.average_rating).toBe(0);
  });

  it('getReviews: should propagate HTTP 404 when destination not found', () => {
    let error: any;
    service.getReviews(999).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/public/destinations/999/reviews')).flush(
      { error: 'not_found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  // ── createReview ──────────────────────────────────────────────────────

  it('createReview: should POST to /destinations/:id/reviews', () => {
    service.createReview(1, { rating: 5, comment: 'Amazing!' }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/destinations/1/reviews') && r.method === 'POST'
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rating: 5, comment: 'Amazing!' });
    req.flush({ message: 'Review created successfully', review_id: 1 });
  });

  it('createReview: should return message and review_id on success', () => {
    let result: any;
    service.createReview(1, { rating: 4, comment: 'Great place' }).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews') && r.method === 'POST');
    req.flush({ message: 'Review created successfully', review_id: 42 });
    expect(result.message).toBe('Review created successfully');
    expect(result.review_id).toBe(42);
  });

  it('createReview: should propagate HTTP 400 on validation error', () => {
    let error: any;
    service.createReview(1, { rating: 6, comment: '' }).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews') && r.method === 'POST').flush(
      { error: 'validation_error', message: 'Rating must be between 1 and 5' },
      { status: 400, statusText: 'Bad Request' }
    );
    expect(error.status).toBe(400);
  });

  it('createReview: should propagate HTTP 401 when not authenticated', () => {
    let error: any;
    service.createReview(1, { rating: 5, comment: 'Nice' }).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews') && r.method === 'POST').flush(
      { error: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );
    expect(error.status).toBe(401);
  });

  // ── updateReview ──────────────────────────────────────────────────────

  it('updateReview: should PUT to /destinations/:id/reviews/:reviewId', () => {
    service.updateReview(1, 10, { rating: 4, comment: 'Updated thoughts' }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/destinations/1/reviews/10') && r.method === 'PUT'
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ rating: 4, comment: 'Updated thoughts' });
    req.flush({ message: 'Review updated successfully' });
  });

  it('updateReview: should return success message', () => {
    let result: any;
    service.updateReview(1, 10, { rating: 3, comment: 'Changed my mind' }).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews/10') && r.method === 'PUT');
    req.flush({ message: 'Review updated successfully' });
    expect(result.message).toBe('Review updated successfully');
  });

  it('updateReview: should propagate HTTP 403 when editing another user review', () => {
    let error: any;
    service.updateReview(1, 10, { rating: 5, comment: 'Hacked' }).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews/10') && r.method === 'PUT').flush(
      { error: 'forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(error.status).toBe(403);
  });

  // ── deleteReview ──────────────────────────────────────────────────────

  it('deleteReview: should DELETE /destinations/:id/reviews/:reviewId', () => {
    service.deleteReview(1, 10).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/destinations/1/reviews/10') && r.method === 'DELETE'
    );
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Review deleted successfully' });
  });

  it('deleteReview: should return success message', () => {
    let result: any;
    service.deleteReview(1, 10).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews/10') && r.method === 'DELETE');
    req.flush({ message: 'Review deleted successfully' });
    expect(result.message).toBe('Review deleted successfully');
  });

  it('deleteReview: should propagate HTTP 403 when deleting another user review', () => {
    let error: any;
    service.deleteReview(1, 10).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews/10') && r.method === 'DELETE').flush(
      { error: 'forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(error.status).toBe(403);
  });

  it('deleteReview: should propagate HTTP 404 when review not found', () => {
    let error: any;
    service.deleteReview(1, 999).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.includes('/destinations/1/reviews/999') && r.method === 'DELETE').flush(
      { error: 'not_found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });
});