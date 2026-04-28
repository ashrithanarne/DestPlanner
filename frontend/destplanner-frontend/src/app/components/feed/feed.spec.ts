import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FeedComponent } from './feed';
import { SocialService, FeedTrip } from '../../services/social.service';
import { AuthService } from '../../services/auth';

const mockTrip: FeedTrip = {
  trip_id: 1,
  trip_name: 'Tokyo Adventure',
  destination: 'Tokyo',
  start_date: '2025-06-01',
  end_date: '2025-06-14',
  status: 'planning',
  visibility: 'public',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  owner_id: 2,
  owner_name: 'Bob B',
};

const mockSocialService = {
  getFeed: vi.fn(() => of({ feed: [mockTrip], page: 1, limit: 20 })),
};

const mockRouter = {
  navigate: vi.fn(),
};

const mockAuthService = {
  currentUser$: of({
    id: 1,
    email: 'a@test.com',
    first_name: 'Alice',
    last_name: 'A',
    created_at: '',
    updated_at: '',
  }),
};

describe('FeedComponent', () => {
  let component: FeedComponent;
  let fixture: ComponentFixture<FeedComponent>;
  let snack: { open: ReturnType<typeof vi.spyOn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocialService.getFeed.mockReturnValue(of({ feed: [mockTrip], page: 1, limit: 20 }));

    await TestBed.configureTestingModule({
      imports: [FeedComponent],
      providers: [
        { provide: SocialService, useValue: mockSocialService },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActivatedRoute, useValue: { params: of({}), snapshot: { params: {} } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedComponent);
    component = fixture.componentInstance;

    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    snack = { open: vi.spyOn(snackBar, 'open') };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load feed on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockSocialService.getFeed).toHaveBeenCalledWith(1, 20);
    expect(component.feed.length).toBe(1);
    expect(component.feed[0].trip_name).toBe('Tokyo Adventure');
  });

  it('should set loading to false after feed loads', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('should show error snack on feed load failure', async () => {
    mockSocialService.getFeed.mockReturnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(snack.open).toHaveBeenCalledWith('Failed to load feed.', 'Close', { duration: 3000 });
  });

  it('should set loading to false on error', async () => {
    mockSocialService.getFeed.mockReturnValue(throwError(() => new Error('error')));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('should set hasMore true when feed length equals limit', async () => {
    const fullPage = Array(20).fill(mockTrip);
    mockSocialService.getFeed.mockReturnValue(of({ feed: fullPage, page: 1, limit: 20 }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.hasMore).toBe(true);
  });

  it('should set hasMore false when feed length is less than limit', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.hasMore).toBe(false); // 1 trip < 20
  });

  it('loadMore should increment page and append trips', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const secondTrip = { ...mockTrip, trip_id: 2, trip_name: 'Paris Trip' };
    mockSocialService.getFeed.mockReturnValue(of({ feed: [secondTrip], page: 2, limit: 20 }));

    component.loadMore();
    await fixture.whenStable();

    expect(component.page).toBe(2);
    expect(component.feed.length).toBe(2);
    expect(component.feed[1].trip_name).toBe('Paris Trip');
  });

  it('viewTrip navigates to trip detail', () => {
    component.viewTrip(mockTrip);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 2, 'trips', 1]);
  });

  it('viewProfile navigates to user profile', () => {
    component.viewProfile(5);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 5, 'profile']);
  });

  it('getStatusColor returns correct color for planning', () => {
    expect(component.getStatusColor('planning')).toBe('accent');
  });

  it('getStatusColor returns warn for cancelled', () => {
    expect(component.getStatusColor('cancelled')).toBe('warn');
  });

  it('getStatusIcon returns correct icon for ongoing', () => {
    expect(component.getStatusIcon('ongoing')).toBe('flight_takeoff');
  });

  it('getStatusIcon returns check_circle for completed', () => {
    expect(component.getStatusIcon('completed')).toBe('check_circle');
  });

  it('getInitials returns correct initials', () => {
    expect(component.getInitials('Bob B')).toBe('BB');
    expect(component.getInitials('Alice Smith')).toBe('AS');
  });

  it('formatDate returns empty string for empty input', () => {
    expect(component.formatDate('')).toBe('');
  });

  it('timeAgo returns "Today" for recent date', () => {
    expect(component.timeAgo(new Date().toISOString())).toBe('Today');
  });

  it('timeAgo returns "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(component.timeAgo(yesterday)).toBe('Yesterday');
  });

  it('loadFeed with reset clears existing feed', async () => {
    component.feed = [mockTrip, mockTrip];
    const newTrip = { ...mockTrip, trip_id: 99, trip_name: 'New Trip' };
    mockSocialService.getFeed.mockReturnValue(of({ feed: [newTrip], page: 1, limit: 20 }));

    component.loadFeed(true);
    await fixture.whenStable();

    expect(component.feed.length).toBe(1);
    expect(component.feed[0].trip_id).toBe(99);
  });

  it('currentUserId is set from auth service', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.currentUserId).toBe(1);
  });
});