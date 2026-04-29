import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Component } from '@angular/core';

@Component({ template: '', standalone: true })
class DummyComponent {}

const testRoutes: Routes = [
  { path: 'destinations', component: DummyComponent },
  { path: 'login', component: DummyComponent },
  { path: '**', component: DummyComponent },
];

import { DestinationDetailComponent } from './destination-detail';
import { DestinationService, Destination, DestinationActivitiesResponse, TravelResponse, AccommodationResponse } from '../../services/destination';
import { BookmarkService } from '../../services/bookmark';
import { AuthService } from '../../services/auth';

const MOCK_DEST: Destination = {
  id: 1, name: 'Paris', country: 'France',
  budget: 2000, description: 'City of Lights',
};

const MOCK_ACTIVITIES: DestinationActivitiesResponse = {
  destination_id: 1,
  total_activities: 2,
  activities: [
    { id: 1, destination_id: 1, name: 'Eiffel Tower', description: 'Iconic tower', category: 'Sightseeing', created_at: '', updated_at: '' },
    { id: 2, destination_id: 1, name: 'Louvre Museum', description: 'World famous museum', category: 'Culture', created_at: '', updated_at: '' },
  ],
};

const MOCK_TRAVEL: TravelResponse = {
  destination_id: 1,
  destination_name: 'Paris',
  total_options: 2,
  travel_options: [
    { id: 1, type: 'Flight', name: 'Direct Flight to Paris', description: 'Round trip direct flight', estimated_cost: 450, currency: 'USD', booking_link: 'https://skyscanner.com' },
    { id: 2, type: 'Train', name: 'Express Train to Paris', description: 'High speed rail', estimated_cost: 120, currency: 'USD', booking_link: 'https://raileurope.com' },
  ],
};

const MOCK_ACCOMMODATIONS: AccommodationResponse = {
  destination_id: 1,
  destination_name: 'Paris',
  total_options: 2,
  accommodation_options: [
    { id: 1, name: 'Luxury Hotel Paris', type: 'Hotel', description: '5-star hotel', estimated_cost: 350, currency: 'USD', booking_link: 'https://booking.com' },
    { id: 2, name: 'Budget Hostel Paris', type: 'Hostel', description: 'Clean hostel', estimated_cost: 30, currency: 'USD', booking_link: 'https://hostelworld.com' },
  ],
};

describe('DestinationDetailComponent', () => {
  let component: DestinationDetailComponent;
  let fixture: ComponentFixture<DestinationDetailComponent>;
  let router: Router;

  const mockDestService = {
    getDestinationById: vi.fn(() => of({ ...MOCK_DEST })),
    getActivities: vi.fn(() => of({ ...MOCK_ACTIVITIES })),
    getReviews: vi.fn(() => of({ destination_id: 1, average_rating: 4.5, total_reviews: 2, reviews: [
      { id: 1, destination_id: 1, user_id: 1, reviewer_name: 'Alice Smith', rating: 5, comment: 'Amazing!', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2, destination_id: 1, user_id: 2, reviewer_name: 'Bob Jones', rating: 4, comment: 'Great place', created_at: '2024-01-02', updated_at: '2024-01-02' },
    ] })),
    createReview: vi.fn(() => of({ message: 'Review created successfully', review_id: 99 })),
    updateReview: vi.fn(() => of({ message: 'Review updated successfully' })),
    deleteReview: vi.fn(() => of({ message: 'Review deleted successfully' })),
    getTravelOptions: vi.fn(() => of({ ...MOCK_TRAVEL })),
    getAccommodationOptions: vi.fn(() => of({ ...MOCK_ACCOMMODATIONS })),
  };

  const mockBookmarkService = {
    getBookmarks: vi.fn(() => of([] as { id: number; destination: string }[])),
    addBookmark: vi.fn(() => of({ message: 'Added' })),
    removeBookmark: vi.fn(() => of({ message: 'Removed' })),
  };

  const mockAuthService = {
    isLoggedIn: vi.fn(() => false),
    getCurrentUser: vi.fn(() => null),
    currentUser$: of(null),
    isLoggedIn$: of(false),
  };

  async function setup(authLoggedIn = false, routeId: string | null = '1') {
    mockDestService.getDestinationById.mockReturnValue(of({ ...MOCK_DEST }));
    mockDestService.getActivities.mockReturnValue(of({ ...MOCK_ACTIVITIES }));
    mockDestService.getReviews.mockReturnValue(of({ destination_id: 1, average_rating: 4.5, total_reviews: 2, reviews: [
      { id: 1, destination_id: 1, user_id: 1, reviewer_name: 'Alice Smith', rating: 5, comment: 'Amazing!', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2, destination_id: 1, user_id: 2, reviewer_name: 'Bob Jones', rating: 4, comment: 'Great place', created_at: '2024-01-02', updated_at: '2024-01-02' },
    ] }));
    mockDestService.createReview.mockReturnValue(of({ message: 'Review created successfully', review_id: 99 }));
    mockDestService.updateReview.mockReturnValue(of({ message: 'Review updated successfully' }));
    mockDestService.deleteReview.mockReturnValue(of({ message: 'Review deleted successfully' }));
    mockDestService.getTravelOptions.mockReturnValue(of({ ...MOCK_TRAVEL }));
    mockDestService.getAccommodationOptions.mockReturnValue(of({ ...MOCK_ACCOMMODATIONS }));
    mockBookmarkService.getBookmarks.mockReturnValue(of([] as { id: number; destination: string }[]));
    mockBookmarkService.addBookmark.mockReturnValue(of({ message: 'Added' }));
    mockBookmarkService.removeBookmark.mockReturnValue(of({ message: 'Removed' }));
    mockAuthService.isLoggedIn.mockReturnValue(authLoggedIn);

    await TestBed.configureTestingModule({
      imports: [DestinationDetailComponent],
      providers: [
        { provide: DestinationService, useValue: mockDestService },
        { provide: BookmarkService, useValue: mockBookmarkService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
        provideRouter(testRoutes),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DestinationDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    await setup();
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ──────────────────────────────────────────────────────────────

  it('ngOnInit: should set isLoggedIn from authService', () => {
    expect(component.isLoggedIn).toBe(false);
  });

  // ── loadDestination ───────────────────────────────────────────────────────


  it('loadDestination: should not check bookmarks when not logged in', async () => {
    mockBookmarkService.getBookmarks.mockClear();
    component.isLoggedIn = false;
    mockDestService.getDestinationById.mockReturnValue(of({ ...MOCK_DEST }));
    component.loadDestination(1);
    await fixture.whenStable();
    expect(mockBookmarkService.getBookmarks).not.toHaveBeenCalled();
  });

  it('loadDestination: should check bookmarks when logged in', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 1, destination: 'Paris' }]));
    component.loadDestination(1);
    await fixture.whenStable();
    expect(mockBookmarkService.getBookmarks).toHaveBeenCalled();
  });

  it('loadDestination: should mark destination as bookmarked when found in bookmarks', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 1, destination: 'Paris' }]));
    component.loadDestination(1);
    await fixture.whenStable();
    expect(component.destination?.is_bookmarked).toBe(true);
  });

  it('loadDestination: should mark destination as not bookmarked when not in bookmarks', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 2, destination: 'Tokyo' }]));
    component.loadDestination(1);
    await fixture.whenStable();
    expect(component.destination?.is_bookmarked).toBe(false);
  });

  it('loadDestination: should set loading false even if bookmarks call fails', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(throwError(() => new Error('fail')));
    component.loadDestination(1);
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  // ── toggleBookmark — not logged in ────────────────────────────────────────
  it('toggleBookmark: should not call service when not logged in', () => {
    component.isLoggedIn = false;
    component.destination = { ...MOCK_DEST };
    component.toggleBookmark();
    expect(mockBookmarkService.addBookmark).not.toHaveBeenCalled();
    expect(mockBookmarkService.removeBookmark).not.toHaveBeenCalled();
  });

  it('toggleBookmark: should do nothing when destination is null', () => {
    component.destination = null;
    component.toggleBookmark();
    expect(mockBookmarkService.addBookmark).not.toHaveBeenCalled();
  });

  // ── toggleBookmark — add ─────────────────────────────────────────────────
  it('toggleBookmark: should call addBookmark when not bookmarked and logged in', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST, is_bookmarked: false };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(mockBookmarkService.addBookmark).toHaveBeenCalledWith(1);
  });

  it('toggleBookmark: should set is_bookmarked to true after add', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST, is_bookmarked: false };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(component.destination?.is_bookmarked).toBe(true);
  });

  // ── toggleBookmark — remove ───────────────────────────────────────────────
  it('toggleBookmark: should call removeBookmark when already bookmarked', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 99, destination: 'Paris' }]));
    component.destination = { ...MOCK_DEST, is_bookmarked: true };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith(99);
  });

  it('toggleBookmark: should set is_bookmarked to false after remove', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 99, destination: 'Paris' }]));
    component.destination = { ...MOCK_DEST, is_bookmarked: true };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(component.destination?.is_bookmarked).toBe(false);
  });

  it('toggleBookmark: should not call removeBookmark if no matching bookmark found', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 99, destination: 'Tokyo' }]));
    component.destination = { ...MOCK_DEST, is_bookmarked: true };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(mockBookmarkService.removeBookmark).not.toHaveBeenCalled();
  });

  // ── goBack ────────────────────────────────────────────────────────────────
  it('goBack: should navigate to /destinations', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/destinations']);
  });

  // ── loadActivities ────────────────────────────────────────────────────────

  it('loadActivities: should call getActivities for all users regardless of login state', async () => {
    await setup(false);
    expect(mockDestService.getActivities).toHaveBeenCalledWith(1);
  });

  it('loadActivities: should also call getActivities when logged in', async () => {
    await setup(true);
    expect(mockDestService.getActivities).toHaveBeenCalledWith(1);
  });

  it('loadActivities: should populate activities array on success', async () => {
    await setup(false);
    expect(component.activities.length).toBe(2);
    expect(component.activities[0].name).toBe('Eiffel Tower');
    expect(component.activities[1].name).toBe('Louvre Museum');
  });

  it('loadActivities: should populate activity description', async () => {
    await setup(false);
    expect(component.activities[0].description).toBe('Iconic tower');
  });

  it('loadActivities: should populate activity category', async () => {
    await setup(false);
    expect(component.activities[0].category).toBe('Sightseeing');
  });

  it('loadActivities: should set activitiesLoading to false on success', async () => {
    await setup(false);
    expect(component.activitiesLoading).toBe(false);
  });

  it('loadActivities: should set activities to empty array when none returned', async () => {
    mockDestService.getActivities.mockReturnValue(of({ destination_id: 1, total_activities: 0, activities: [] }));
    await setup(false);
    expect(component.activities).toEqual([]);
  });

  it('loadActivities: should set activitiesError on API failure', async () => {
    mockDestService.getActivities.mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Server error' } })));
    await setup(false);
    expect(component.activitiesError).toBeTruthy();
    expect(component.activitiesLoading).toBe(false);
  });

  it('loadActivities: should set activitiesLoading to false on API failure', async () => {
    mockDestService.getActivities.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup(false);
    expect(component.activitiesLoading).toBe(false);
  });

  // ── loadTravelOptions ─────────────────────────────────────────────────────

  it('loadTravelOptions: should call getTravelOptions for all users', async () => {
    await setup(false);
    expect(mockDestService.getTravelOptions).toHaveBeenCalledWith(1);
  });

  it('loadTravelOptions: should also call getTravelOptions when logged in', async () => {
    await setup(true);
    expect(mockDestService.getTravelOptions).toHaveBeenCalledWith(1);
  });

  it('loadTravelOptions: should populate travelOptions array on success', async () => {
    await setup(false);
    expect(component.travelOptions.length).toBe(2);
    expect(component.travelOptions[0].name).toBe('Direct Flight to Paris');
    expect(component.travelOptions[1].name).toBe('Express Train to Paris');
  });

  it('loadTravelOptions: should populate type and estimated_cost fields', async () => {
    await setup(false);
    expect(component.travelOptions[0].type).toBe('Flight');
    expect(component.travelOptions[0].estimated_cost).toBe(450);
    expect(component.travelOptions[0].currency).toBe('USD');
  });

  it('loadTravelOptions: should populate booking_link field', async () => {
    await setup(false);
    expect(component.travelOptions[0].booking_link).toBe('https://skyscanner.com');
  });

  it('loadTravelOptions: should set travelLoading to false on success', async () => {
    await setup(false);
    expect(component.travelLoading).toBe(false);
  });

  it('loadTravelOptions: should set travelOptions to empty array when none returned', async () => {
    mockDestService.getTravelOptions.mockReturnValue(of({ destination_id: 1, destination_name: 'Paris', total_options: 0, travel_options: [] }));
    await setup(false);
    expect(component.travelOptions).toEqual([]);
  });

  it('loadTravelOptions: should set travelError on API failure', async () => {
    mockDestService.getTravelOptions.mockReturnValue(throwError(() => ({ error: { message: 'Failed' } })));
    await setup(false);
    expect(component.travelError).toBeTruthy();
    expect(component.travelLoading).toBe(false);
  });

  it('loadTravelOptions: should set travelLoading to false on API failure', async () => {
    mockDestService.getTravelOptions.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup(false);
    expect(component.travelLoading).toBe(false);
  });

  // ── loadAccommodationOptions ────────────────────────────────────────────

  it('loadAccommodationOptions: should call getAccommodationOptions for all users', async () => {
    await setup(false);
    expect(mockDestService.getAccommodationOptions).toHaveBeenCalledWith(1);
  });

  it('loadAccommodationOptions: should also call getAccommodationOptions when logged in', async () => {
    await setup(true);
    expect(mockDestService.getAccommodationOptions).toHaveBeenCalledWith(1);
  });

  it('loadAccommodationOptions: should populate accommodations array on success', async () => {
    await setup(false);
    expect(component.accommodations.length).toBe(2);
    expect(component.accommodations[0].name).toBe('Luxury Hotel Paris');
    expect(component.accommodations[1].name).toBe('Budget Hostel Paris');
  });

  it('loadAccommodationOptions: should populate type and estimated_cost fields', async () => {
    await setup(false);
    expect(component.accommodations[0].type).toBe('Hotel');
    expect(component.accommodations[0].estimated_cost).toBe(350);
    expect(component.accommodations[0].currency).toBe('USD');
  });

  it('loadAccommodationOptions: should populate booking_link field', async () => {
    await setup(false);
    expect(component.accommodations[0].booking_link).toBe('https://booking.com');
  });

  it('loadAccommodationOptions: should set accommodationsLoading to false on success', async () => {
    await setup(false);
    expect(component.accommodationsLoading).toBe(false);
  });

  it('loadAccommodationOptions: should set accommodations to empty array when none returned', async () => {
    mockDestService.getAccommodationOptions.mockReturnValue(of({ destination_id: 1, destination_name: 'Paris', total_options: 0, accommodation_options: [] }));
    await setup(false);
    expect(component.accommodations).toEqual([]);
  });

  it('loadAccommodationOptions: should set accommodationsError on API failure', async () => {
    mockDestService.getAccommodationOptions.mockReturnValue(throwError(() => ({ error: { message: 'Failed' } })));
    await setup(false);
    expect(component.accommodationsError).toBeTruthy();
    expect(component.accommodationsLoading).toBe(false);
  });

  it('loadAccommodationOptions: should set accommodationsLoading to false on API failure', async () => {
    mockDestService.getAccommodationOptions.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup(false);
    expect(component.accommodationsLoading).toBe(false);
  });

  // ── loadReviews ────────────────────────────────────────────────────────────

  it('loadReviews: should call getReviews for all users regardless of login state', async () => {
    await setup(false);
    expect(mockDestService.getReviews).toHaveBeenCalledWith(1);
  });

  it('loadReviews: should also call getReviews when logged in', async () => {
    await setup(true);
    expect(mockDestService.getReviews).toHaveBeenCalledWith(1);
  });

  it('loadReviews: should populate reviews array on success', async () => {
    await setup(false);
    expect(component.reviews.length).toBe(2);
    expect(component.reviews[0].reviewer_name).toBe('Alice Smith');
    expect(component.reviews[1].reviewer_name).toBe('Bob Jones');
  });

  it('loadReviews: should populate averageRating and totalReviews', async () => {
    await setup(false);
    expect(component.averageRating).toBe(4.5);
    expect(component.totalReviews).toBe(2);
  });

  it('loadReviews: should populate rating and comment fields', async () => {
    await setup(false);
    expect(component.reviews[0].rating).toBe(5);
    expect(component.reviews[0].comment).toBe('Amazing!');
  });

  it('loadReviews: should set reviewsLoading to false on success', async () => {
    await setup(false);
    expect(component.reviewsLoading).toBe(false);
  });

  it('loadReviews: should set reviews to empty array when none returned', async () => {
    mockDestService.getReviews.mockReturnValue(of({ destination_id: 1, average_rating: 0, total_reviews: 0, reviews: [] }));
    await setup(false);
    expect(component.reviews).toEqual([]);
    expect(component.totalReviews).toBe(0);
    expect(component.averageRating).toBe(0);
  });

  it('loadReviews: should set reviewsError on API failure', async () => {
    mockDestService.getReviews.mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Server error' } })));
    await setup(false);
    expect(component.reviewsError).toBeTruthy();
    expect(component.reviewsLoading).toBe(false);
  });

  it('loadReviews: should set reviewsLoading to false on API failure', async () => {
    mockDestService.getReviews.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup(false);
    expect(component.reviewsLoading).toBe(false);
  });

  // ── setRating ──────────────────────────────────────────────────────────────

  it('setRating: should update the rating form control value', () => {
    component.setRating(3);
    expect(component.reviewForm.controls.rating.value).toBe(3);
  });

  it('setRating: should accept any value from 1 to 5', () => {
    [1, 2, 3, 4, 5].forEach(v => {
      component.setRating(v);
      expect(component.reviewForm.controls.rating.value).toBe(v);
    });
  });

  // ── canEditReview ───────────────────────────────────────────────────────

  it('canEditReview: should return true when review belongs to current user', () => {
    component.currentUserId = 1;
    const review = { id: 1, destination_id: 1, user_id: 1, reviewer_name: 'Alice', rating: 5, comment: 'Nice', created_at: '', updated_at: '' };
    expect(component.canEditReview(review)).toBe(true);
  });

  it('canEditReview: should return false when review belongs to another user', () => {
    component.currentUserId = 1;
    const review = { id: 2, destination_id: 1, user_id: 2, reviewer_name: 'Bob', rating: 4, comment: 'Good', created_at: '', updated_at: '' };
    expect(component.canEditReview(review)).toBe(false);
  });

  it('canEditReview: should return false when currentUserId is null', () => {
    component.currentUserId = null;
    const review = { id: 1, destination_id: 1, user_id: 1, reviewer_name: 'Alice', rating: 5, comment: 'Nice', created_at: '', updated_at: '' };
    expect(component.canEditReview(review)).toBe(false);
  });

  // ── startEdit / cancelEdit ──────────────────────────────────────────────

  it('startEdit: should set editingReviewId and patch form values', () => {
    const review = { id: 5, destination_id: 1, user_id: 1, reviewer_name: 'Alice', rating: 3, comment: 'Decent', created_at: '', updated_at: '' };
    component.startEdit(review);
    expect(component.editingReviewId).toBe(5);
    expect(component.reviewForm.controls.rating.value).toBe(3);
    expect(component.reviewForm.controls.comment.value).toBe('Decent');
  });

  it('cancelEdit: should clear editingReviewId and reset form', () => {
    component.editingReviewId = 5;
    component.cancelEdit();
    expect(component.editingReviewId).toBeNull();
    expect(component.reviewForm.controls.rating.value).toBe(5);
    expect(component.reviewForm.controls.comment.value).toBe('');
  });

  // ── submitReview ────────────────────────────────────────────────────────

  it('submitReview: should not call service when not logged in', () => {
    component.isLoggedIn = false;
    component.destination = { ...MOCK_DEST };
    component.submitReview();
    expect(mockDestService.createReview).not.toHaveBeenCalled();
  });

  it('submitReview: should not call service when destination is null', () => {
    component.isLoggedIn = true;
    component.destination = null;
    component.submitReview();
    expect(mockDestService.createReview).not.toHaveBeenCalled();
  });

  it('submitReview: should call createReview when no editingReviewId', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST };
    component.editingReviewId = null;
    component.reviewForm.setValue({ rating: 5, comment: 'Wonderful!' });
    component.submitReview();
    await fixture.whenStable();
    expect(mockDestService.createReview).toHaveBeenCalledWith(1, { rating: 5, comment: 'Wonderful!' });
  });

  it('submitReview: should call updateReview when editingReviewId is set', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST };
    component.editingReviewId = 7;
    component.reviewForm.setValue({ rating: 4, comment: 'Updated comment' });
    component.submitReview();
    await fixture.whenStable();
    expect(mockDestService.updateReview).toHaveBeenCalledWith(1, 7, { rating: 4, comment: 'Updated comment' });
  });

  it('submitReview: should reload reviews after successful create', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST };
    component.reviewForm.setValue({ rating: 5, comment: 'Great!' });
    component.submitReview();
    await fixture.whenStable();
    expect(mockDestService.getReviews).toHaveBeenCalled();
  });

  it('submitReview: should reset form after successful submit', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST };
    component.editingReviewId = 7;
    component.reviewForm.setValue({ rating: 4, comment: 'Updated' });
    component.submitReview();
    await fixture.whenStable();
    expect(component.editingReviewId).toBeNull();
  });

  // ── deleteReview ────────────────────────────────────────────────────────

  it('deleteReview: should not call service when not logged in', () => {
    component.isLoggedIn = false;
    component.destination = { ...MOCK_DEST };
    component.deleteReview(1);
    expect(mockDestService.deleteReview).not.toHaveBeenCalled();
  });

  it('deleteReview: should not call service when destination is null', () => {
    component.isLoggedIn = true;
    component.destination = null;
    component.deleteReview(1);
    expect(mockDestService.deleteReview).not.toHaveBeenCalled();
  });
});
