import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';

import { DestinationsComponent } from './destinations';
import { DestinationService, Destination } from '../../services/destination';
import { BookmarkService, BookmarkResponse } from '../../services/bookmark';
import { AuthService } from '../../services/auth';

const MOCK_DESTINATIONS: Destination[] = [
  { id: 1, name: 'Paris', country: 'France', budget: 2000, description: 'City of Lights' },
  { id: 2, name: 'Tokyo', country: 'Japan', budget: 3000, description: 'City of Tech' },
];

describe('DestinationsComponent', () => {
  let component: DestinationsComponent;
  let fixture: ComponentFixture<DestinationsComponent>;

  const mockDestService = {
    getDestinations: vi.fn(() => of(MOCK_DESTINATIONS)),
  };

  const mockBookmarkService = {
    getBookmarks: vi.fn(() => of([] as BookmarkResponse[])),
    addBookmark: vi.fn(() => of({ message: 'Added' })),
    removeBookmark: vi.fn(() => of({ message: 'Removed' })),
  };

  const mockAuthService = {
    isLoggedIn: vi.fn(() => false),
  };

  // Synchronous no-op snack bar — no setTimeout, no overlay, no CDK portals.
  // Must be injected via overrideComponent (not configureTestingModule providers)
  // because DestinationsComponent is standalone and imports MatSnackBarModule,
  // creating its own component-level injector that shadows root-level overrides.
  const mockSnackBar = {
    open: vi.fn(() => ({ onAction: () => new Subject() })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDestService.getDestinations.mockReturnValue(of([...MOCK_DESTINATIONS.map(d => ({ ...d }))]));
    mockBookmarkService.getBookmarks.mockReturnValue(of([] as BookmarkResponse[]));
    mockAuthService.isLoggedIn.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [DestinationsComponent],
      providers: [
        { provide: DestinationService, useValue: mockDestService },
        { provide: BookmarkService, useValue: mockBookmarkService },
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
        provideNoopAnimations(),
      ],
    })
    .overrideComponent(DestinationsComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: mockSnackBar }] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(DestinationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit: should call loadDestinations', () => {
    expect(mockDestService.getDestinations).toHaveBeenCalled();
  });

  it('ngOnInit: should set isLoggedIn from authService', () => {
    expect(component.isLoggedIn).toBe(false);
  });

  it('loadDestinations: should populate destinations array', () => {
    expect(component.destinations.length).toBe(2);
    expect(component.destinations[0].name).toBe('Paris');
  });

  it('loadDestinations: should set loading to false on success', () => {
    expect(component.loading).toBe(false);
  });

  it('loadDestinations: should set loading to false on error', async () => {
    mockDestService.getDestinations.mockReturnValue(throwError(() => new Error('fail')));
    component.loadDestinations();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('loadDestinations: should load bookmarks when logged in', async () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 1, destination: 'Paris' }] as BookmarkResponse[]));
    component.isLoggedIn = true;
    component.loadDestinations();
    await fixture.whenStable();
    const paris = component.destinations.find(d => d.name === 'Paris');
    expect(paris?.is_bookmarked).toBe(true);
  });

  it('toggleBookmark: should not call addBookmark when not logged in', () => {
    const event = new MouseEvent('click');
    component.isLoggedIn = false;
    component.toggleBookmark({ ...MOCK_DESTINATIONS[0] }, event);
    expect(mockBookmarkService.addBookmark).not.toHaveBeenCalled();
  });



  it('toggleBookmark: should call removeBookmark when already bookmarked', async () => {
    component.isLoggedIn = true;
    mockBookmarkService.getBookmarks.mockReturnValue(of([{ id: 99, destination: 'Paris' }]));
    const dest = { ...MOCK_DESTINATIONS[0], is_bookmarked: true };
    const event = new MouseEvent('click');
    component.toggleBookmark(dest, event);
    await fixture.whenStable();
    expect(mockBookmarkService.getBookmarks).toHaveBeenCalled();
    expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith(99);
  });

  it('viewDetails: should be a defined method', () => {
    expect(typeof component.viewDetails).toBe('function');
  });
});