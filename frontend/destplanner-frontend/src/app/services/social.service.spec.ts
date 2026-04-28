import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SocialService, PublicProfile, FeedTrip, FollowListEntry } from './social.service';
import { environment } from '../../environments/environment';

describe('SocialService', () => {
  let service: SocialService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const mockProfile: PublicProfile = {
    id: 2,
    first_name: 'Bob',
    last_name: 'B',
    follower_count: 3,
    following_count: 1,
    is_following: false,
  };

  const mockFeedTrip: FeedTrip = {
    trip_id: 10,
    trip_name: 'Tokyo Adventure',
    destination: 'Tokyo',
    start_date: '2025-06-01',
    end_date: '2025-06-14',
    status: 'planning',
    visibility: 'public',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    owner_id: 2,
    owner_name: 'Bob B',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SocialService],
    });
    service = TestBed.inject(SocialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── followUser ─────────────────────────────────────────────────────────────

  it('followUser sends POST to correct URL', () => {
    service.followUser(2).subscribe(res => {
      expect(res.message).toBe('User followed successfully');
    });
    const req = httpMock.expectOne(`${base}/users/2/follow`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'User followed successfully' });
  });

  it('followUser passes empty body', () => {
    service.followUser(5).subscribe();
    const req = httpMock.expectOne(`${base}/users/5/follow`);
    expect(req.request.body).toEqual({});
    req.flush({ message: 'ok' });
  });

  // ── unfollowUser ───────────────────────────────────────────────────────────

  it('unfollowUser sends DELETE to correct URL', () => {
    service.unfollowUser(2).subscribe(res => {
      expect(res.message).toBe('User unfollowed successfully');
    });
    const req = httpMock.expectOne(`${base}/users/2/follow`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'User unfollowed successfully' });
  });

  it('unfollowUser uses correct user id in URL', () => {
    service.unfollowUser(99).subscribe();
    const req = httpMock.expectOne(`${base}/users/99/follow`);
    expect(req.request.url).toContain('99');
    req.flush({ message: 'ok' });
  });

  // ── getPublicProfile ───────────────────────────────────────────────────────

  it('getPublicProfile sends GET to correct URL', () => {
    service.getPublicProfile(2).subscribe(profile => {
      expect(profile.first_name).toBe('Bob');
      expect(profile.follower_count).toBe(3);
    });
    const req = httpMock.expectOne(`${base}/users/2/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('getPublicProfile returns is_following flag', () => {
    service.getPublicProfile(2).subscribe(profile => {
      expect(profile.is_following).toBe(false);
    });
    const req = httpMock.expectOne(`${base}/users/2/profile`);
    req.flush(mockProfile);
  });

  // ── getFollowers ───────────────────────────────────────────────────────────

  it('getFollowers sends GET to correct URL', () => {
    const mockFollowers: FollowListEntry[] = [{ id: 1, first_name: 'Alice', last_name: 'A' }];
    service.getFollowers(2).subscribe(res => {
      expect(res.followers.length).toBe(1);
      expect(res.followers[0].first_name).toBe('Alice');
    });
    const req = httpMock.expectOne(`${base}/users/2/followers`);
    expect(req.request.method).toBe('GET');
    req.flush({ followers: mockFollowers });
  });

  it('getFollowers returns empty array when no followers', () => {
    service.getFollowers(2).subscribe(res => {
      expect(res.followers).toEqual([]);
    });
    const req = httpMock.expectOne(`${base}/users/2/followers`);
    req.flush({ followers: [] });
  });

  // ── getFollowing ───────────────────────────────────────────────────────────

  it('getFollowing sends GET to correct URL', () => {
    service.getFollowing(1).subscribe(res => {
      expect(res.following).toBeDefined();
    });
    const req = httpMock.expectOne(`${base}/users/1/following`);
    expect(req.request.method).toBe('GET');
    req.flush({ following: [] });
  });

  it('getFollowing returns list of followed users', () => {
    const mockFollowing: FollowListEntry[] = [
      { id: 2, first_name: 'Bob', last_name: 'B' },
      { id: 3, first_name: 'Carol', last_name: 'C' },
    ];
    service.getFollowing(1).subscribe(res => {
      expect(res.following.length).toBe(2);
    });
    const req = httpMock.expectOne(`${base}/users/1/following`);
    req.flush({ following: mockFollowing });
  });

  // ── getPublicTripsForUser ──────────────────────────────────────────────────

  it('getPublicTripsForUser sends GET to correct URL', () => {
    service.getPublicTripsForUser(2).subscribe(res => {
      expect(res.trips.length).toBe(1);
    });
    const req = httpMock.expectOne(`${base}/users/2/trips`);
    expect(req.request.method).toBe('GET');
    req.flush({ trips: [mockFeedTrip] });
  });

  it('getPublicTripsForUser returns empty list when no public trips', () => {
    service.getPublicTripsForUser(2).subscribe(res => {
      expect(res.trips).toEqual([]);
    });
    const req = httpMock.expectOne(`${base}/users/2/trips`);
    req.flush({ trips: [] });
  });

  // ── getFeed ────────────────────────────────────────────────────────────────

  it('getFeed sends GET with default pagination', () => {
    service.getFeed().subscribe(res => {
      expect(res.feed).toBeDefined();
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
    });
    const req = httpMock.expectOne(`${base}/feed?page=1&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ feed: [mockFeedTrip], page: 1, limit: 20 });
  });

  it('getFeed sends GET with custom pagination', () => {
    service.getFeed(2, 10).subscribe();
    const req = httpMock.expectOne(`${base}/feed?page=2&limit=10`);
    expect(req.request.url).toContain('page=2');
    expect(req.request.url).toContain('limit=10');
    req.flush({ feed: [], page: 2, limit: 10 });
  });

  it('getFeed returns trip cards with owner info', () => {
    service.getFeed().subscribe(res => {
      expect(res.feed[0].owner_name).toBe('Bob B');
      expect(res.feed[0].trip_name).toBe('Tokyo Adventure');
    });
    const req = httpMock.expectOne(`${base}/feed?page=1&limit=20`);
    req.flush({ feed: [mockFeedTrip], page: 1, limit: 20 });
  });

  // ── updateTripVisibility ───────────────────────────────────────────────────

  it('updateTripVisibility sends PUT to correct URL', () => {
    service.updateTripVisibility(5, 'public').subscribe(res => {
      expect(res.visibility).toBe('public');
    });
    const req = httpMock.expectOne(`${base}/trips/5/visibility`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Visibility updated', visibility: 'public' });
  });

  it('updateTripVisibility sends correct body for private', () => {
    service.updateTripVisibility(3, 'private').subscribe();
    const req = httpMock.expectOne(`${base}/trips/3/visibility`);
    expect(req.request.body).toEqual({ visibility: 'private' });
    req.flush({ message: 'Visibility updated', visibility: 'private' });
  });

  it('updateTripVisibility sends correct body for public', () => {
    service.updateTripVisibility(7, 'public').subscribe();
    const req = httpMock.expectOne(`${base}/trips/7/visibility`);
    expect(req.request.body).toEqual({ visibility: 'public' });
    req.flush({ message: 'Visibility updated', visibility: 'public' });
  });
});