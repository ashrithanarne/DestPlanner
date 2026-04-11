import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Component } from '@angular/core';

@Component({ template: '', standalone: true })
class DummyComponent {}

const testRoutes: Routes = [
  { path: 'destinations', component: DummyComponent },
  { path: '**', component: DummyComponent },
];

import { DestinationDetailComponent } from './destination-detail';
import { DestinationService, Destination } from '../../services/destination';
import { BookmarkService } from '../../services/bookmark';
import { AuthService } from '../../services/auth';

const MOCK_DEST: Destination = {
  id: 1, name: 'Paris', country: 'France',
  budget: 2000, description: 'City of Lights',
};

describe('DestinationDetailComponent', () => {
  let component: DestinationDetailComponent;
  let fixture: ComponentFixture<DestinationDetailComponent>;

  const mockDestService = {
    getDestinationById: vi.fn(),
  };

  const mockBookmarkService = {
    getBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  };

  const mockAuthService = {
    isLoggedIn: vi.fn(),
    getCurrentUser: vi.fn(),
  };


  beforeEach(async () => {
    vi.clearAllMocks();
    mockDestService.getDestinationById.mockReturnValue(of({ ...MOCK_DEST }));
    mockDestService.getReviews = vi.fn().mockReturnValue(of({
      destination_id: 1,
      average_rating: 0,
      total_reviews: 0,
      reviews: [],
    }));
    mockDestService.createReview = vi.fn().mockReturnValue(of({ message: 'created', review_id: 1 }));
    mockDestService.updateReview = vi.fn().mockReturnValue(of({ message: 'updated' }));
    mockDestService.deleteReview = vi.fn().mockReturnValue(of({ message: 'deleted' }));
    mockBookmarkService.getBookmarks.mockReturnValue(of([]));
    mockBookmarkService.addBookmark.mockReturnValue(of({ message: 'Added' }));
    mockBookmarkService.removeBookmark.mockReturnValue(of({ message: 'Removed' }));
    mockAuthService.isLoggedIn.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [DestinationDetailComponent],
      providers: [
        { provide: DestinationService, useValue: mockDestService },
        { provide: BookmarkService, useValue: mockBookmarkService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (_key: string) => '1' } } },
        },
        provideRouter(testRoutes),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DestinationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });



  it('loadDestination: should set loading to false on error', async () => {
    mockDestService.getDestinationById.mockReturnValue(throwError(() => new Error('fail')));
    component.loadDestination(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  // ── loadDestination — when logged in, checks bookmarks ───────────────────
  it('loadDestination: should check bookmarks when logged in', async () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockDestService.getDestinationById.mockReturnValue(of({ ...MOCK_DEST }));
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 1, destination: 'Paris' }]));
    component.isLoggedIn = true;
    component.loadDestination(1);
    await fixture.whenStable();
    expect(mockBookmarkService.getBookmarks).toHaveBeenCalled();
    expect(component.destination?.is_bookmarked).toBe(true);
  });

  // ── toggleBookmark — not logged in ────────────────────────────────────────
  it('toggleBookmark: should not call service when not logged in', () => {
    component.isLoggedIn = false;
    component.destination = { ...MOCK_DEST };
    component.toggleBookmark();
    expect(mockBookmarkService.addBookmark).not.toHaveBeenCalled();
  });

  // ── toggleBookmark — add ─────────────────────────────────────────────────
  it('toggleBookmark: should addBookmark when not bookmarked and logged in', async () => {
    component.isLoggedIn = true;
    component.destination = { ...MOCK_DEST, is_bookmarked: false };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(mockBookmarkService.addBookmark).toHaveBeenCalledWith(1);
    expect(component.destination?.is_bookmarked).toBe(true);
  });

  // ── toggleBookmark — remove ───────────────────────────────────────────────
  it('toggleBookmark: should removeBookmark when already bookmarked', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 99, destination: 'Paris' }]));
    component.destination = { ...MOCK_DEST, is_bookmarked: true };
    component.toggleBookmark();
    await fixture.whenStable();
    expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith(99);
    expect(component.destination?.is_bookmarked).toBe(false);
  });

  // ── goBack ────────────────────────────────────────────────────────────────
  it('goBack: should be a defined method', () => {
    expect(typeof component.goBack).toBe('function');
  });
});
