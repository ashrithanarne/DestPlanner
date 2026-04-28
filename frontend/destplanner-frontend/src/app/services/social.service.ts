import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicProfile {
  id: number;
  first_name: string;
  last_name: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
}

export interface FollowListEntry {
  id: number;
  first_name: string;
  last_name: string;
}

export interface FeedTrip {
  trip_id: number;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
  owner_name: string;
}

export interface FeedResponse {
  feed: FeedTrip[];
  page: number;
  limit: number;
}

export interface PublicTripsResponse {
  trips: FeedTrip[];
}

export interface UserSearchResult {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  followUser(userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/users/${userId}/follow`, {});
  }

  unfollowUser(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/${userId}/follow`);
  }

  getPublicProfile(userId: number): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(`${this.base}/users/${userId}/profile`);
  }

  getFollowers(userId: number): Observable<{ followers: FollowListEntry[] }> {
    return this.http.get<{ followers: FollowListEntry[] }>(`${this.base}/users/${userId}/followers`);
  }

  getFollowing(userId: number): Observable<{ following: FollowListEntry[] }> {
    return this.http.get<{ following: FollowListEntry[] }>(`${this.base}/users/${userId}/following`);
  }

  getPublicTripsForUser(userId: number): Observable<PublicTripsResponse> {
    return this.http.get<PublicTripsResponse>(`${this.base}/users/${userId}/trips`);
  }

  getFeed(page = 1, limit = 20): Observable<FeedResponse> {
    return this.http.get<FeedResponse>(`${this.base}/feed?page=${page}&limit=${limit}`);
  }

  searchUsers(query: string): Observable<UserSearchResponse> {
    return this.http.get<UserSearchResponse>(`${this.base}/users/search?q=${encodeURIComponent(query)}`);
  }

  updateTripVisibility(tripId: number, visibility: 'public' | 'private'): Observable<{ message: string; visibility: string }> {
    return this.http.put<{ message: string; visibility: string }>(
      `${this.base}/trips/${tripId}/visibility`,
      { visibility }
    );
  }
}