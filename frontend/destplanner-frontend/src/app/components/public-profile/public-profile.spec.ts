import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PublicProfileComponent } from './public-profile';
import { SocialService, PublicProfile } from '../../services/social.service';
import { AuthService } from '../../services/auth';

const mockProfile: PublicProfile = {
  id: 2,
  first_name: 'Bob',
  last_name: 'B',
  follower_count: 3,
  following_count: 1,
  is_following: false,
};

const mockSocialService = {
  getPublicProfile: vi.fn(() => of(mockProfile)),
  getPublicTripsForUser: vi.fn(() => of({ trips: [] })),
  getFollowers: vi.fn(() => of({ followers: [] })),
  getFollowing: vi.fn(() => of({ following: [] })),
  followUser: vi.fn(() => of({ message: 'ok' })),
  unfollowUser: vi.fn(() => of({ message: 'ok' })),
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

describe('PublicProfileComponent', () => {
  let component: PublicProfileComponent;
  let fixture: ComponentFixture<PublicProfileComponent>;
  let snack: { open: ReturnType<typeof vi.spyOn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocialService.getPublicProfile.mockReturnValue(of({ ...mockProfile }));
    mockSocialService.getPublicTripsForUser.mockReturnValue(of({ trips: [] }));
    mockSocialService.getFollowers.mockReturnValue(of({ followers: [] }));
    mockSocialService.getFollowing.mockReturnValue(of({ following: [] }));

    await TestBed.configureTestingModule({
      imports: [PublicProfileComponent],
      providers: [
        { provide: SocialService, useValue: mockSocialService },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActivatedRoute, useValue: { params: of({ id: '2' }), snapshot: { params: { id: '2' } } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicProfileComponent);
    component = fixture.componentInstance;

    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    snack = { open: vi.spyOn(snackBar, 'open') };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockSocialService.getPublicProfile).toHaveBeenCalledWith(2);
    expect(component.profile?.first_name).toBe('Bob');
  });

  it('should load public trips on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockSocialService.getPublicTripsForUser).toHaveBeenCalledWith(2);
  });

  it('should load followers and following on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockSocialService.getFollowers).toHaveBeenCalledWith(2);
    expect(mockSocialService.getFollowing).toHaveBeenCalledWith(2);
  });

  it('should set loading to false after load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('should detect own profile correctly', async () => {
    // currentUserId is 1, targetUserId is 2 → not own profile
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.isOwnProfile).toBe(false);
  });

  it('should navigate to feed on 404', async () => {
    mockSocialService.getPublicProfile.mockReturnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/feed']);
  });

  it('should show snack on generic load error', async () => {
    mockSocialService.getPublicProfile.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(snack.open).toHaveBeenCalledWith('Failed to load profile.', 'Close', { duration: 3000 });
  });

  it('toggleFollow should call followUser when not following', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleFollow();
    await fixture.whenStable();

    expect(mockSocialService.followUser).toHaveBeenCalledWith(2);
  });

  it('toggleFollow should call unfollowUser when following', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    if (component.profile) component.profile.is_following = true;
    component.toggleFollow();
    await fixture.whenStable();

    expect(mockSocialService.unfollowUser).toHaveBeenCalledWith(2);
  });

  it('toggleFollow increments follower_count when following', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const initialCount = component.profile!.follower_count;
    component.toggleFollow();
    await fixture.whenStable();

    expect(component.profile!.follower_count).toBe(initialCount + 1);
    expect(component.profile!.is_following).toBe(true);
  });

  it('toggleFollow decrements follower_count when unfollowing', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.profile!.is_following = true;
    component.profile!.follower_count = 5;
    component.toggleFollow();
    await fixture.whenStable();

    expect(component.profile!.follower_count).toBe(4);
    expect(component.profile!.is_following).toBe(false);
  });

  it('toggleFollow shows snack on error', async () => {
    mockSocialService.followUser.mockReturnValue(
      throwError(() => ({ error: { message: 'Already following' } }))
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleFollow();
    await fixture.whenStable();

    expect(snack.open).toHaveBeenCalledWith('Already following', 'Close', { duration: 3000 });
  });

  it('getInitials returns correct value', () => {
    expect(component.getInitials('Bob', 'B')).toBe('BB');
    expect(component.getInitials('Alice', 'Smith')).toBe('AS');
  });

  it('getInitials handles empty strings', () => {
    expect(component.getInitials('', '')).toBe('');
  });

  it('formatDate returns empty for empty input', () => {
    expect(component.formatDate('')).toBe('');
  });

  it('getStatusClass returns correct class', () => {
    expect(component.getStatusClass('planning')).toBe('status-planning');
    expect(component.getStatusClass('cancelled')).toBe('status-cancelled');
  });

  it('viewTrip navigates correctly', () => {
    const trip: any = { trip_id: 7, owner_id: 2 };
    component.viewTrip(trip);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 2, 'trips', 7]);
  });

  it('navigateToProfile navigates correctly', () => {
    component.navigateToProfile(5);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 5, 'profile']);
  });

  it('goToMyProfile navigates to /profile', () => {
    component.goToMyProfile();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
  });
});