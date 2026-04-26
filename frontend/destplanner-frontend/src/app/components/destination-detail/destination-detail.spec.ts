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
  let router: Router;

  const mockDestService = {
    getDestinationById: vi.fn(() => of({ ...MOCK_DEST })),
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
});
