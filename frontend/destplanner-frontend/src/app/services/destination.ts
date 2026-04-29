import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DestinationCompare {
  id: number;
  name: string;
  country: string;
  budget: number;
  description: string;
  best_season: string;
  travel_time: string;
  activities: string[];
}

export interface CompareResponse {
  total_destinations: number;
  destinations: DestinationCompare[];
}

export interface Destination {
  id: number;
  name: string;
  country: string;
  budget: number;
  description: string;
  is_bookmarked?: boolean;
  category?: string;
  rating?: number;
  image_url?: string;
}

export interface DestinationReview {
  id: number;
  destination_id: number;
  user_id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface DestinationReviewsResponse {
  destination_id: number;
  average_rating: number;
  total_reviews: number;
  reviews: DestinationReview[];
}

export interface DestinationActivity {
  id: number;
  destination_id: number;
  name: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface DestinationActivitiesResponse {
  destination_id: number;
  total_activities: number;
  activities: DestinationActivity[];
}

export interface TravelOption {
  id: number;
  type: string;
  name: string;
  description: string;
  estimated_cost: number;
  currency: string;
  booking_link: string;
}

export interface AccommodationOption {
  id: number;
  name: string;
  type: string;
  description: string;
  estimated_cost: number;
  currency: string;
  booking_link: string;
}

export interface TravelResponse {
  destination_id: number;
  destination_name: string;
  total_options: number;
  travel_options: TravelOption[];
}

export interface AccommodationResponse {
  destination_id: number;
  destination_name: string;
  total_options: number;
  accommodation_options: AccommodationOption[];
}

@Injectable({
  providedIn: 'root'
})
export class DestinationService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDestinations(budget?: number, country?: string): Observable<Destination[]> {
    let url = `${this.baseUrl}/auth/destinations`;
    const params: string[] = [];
    if (budget) params.push(`budget=${budget}`);
    if (country) params.push(`country=${country}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.http.get<Destination[]>(url);
  }

  /** GET /auth/destinations?category=<category> */
  getDestinationsByCategory(category: string): Observable<Destination[]> {
    const url = `${this.baseUrl}/auth/destinations?category=${encodeURIComponent(category)}`;
    return this.http.get<Destination[]>(url);
  }

  getDestinationById(id: number): Observable<Destination> {
    return this.http.get<Destination>(`${this.baseUrl}/auth/destinations/${id}`);
  }

  suggestDestinations(query: string): Observable<{id: number, name: string}[]> {
    return this.http.get<{id: number, name: string}[]>(`${this.baseUrl}/auth/destinations/suggest?q=${query}`);
  }

  getReviews(destinationId: number): Observable<DestinationReviewsResponse> {
    return this.http.get<DestinationReviewsResponse>(
      `${this.baseUrl}/public/destinations/${destinationId}/reviews`
    );
  }

  getActivities(destinationId: number): Observable<DestinationActivitiesResponse> {
    return this.http.get<DestinationActivitiesResponse>(
      `${this.baseUrl}/public/destinations/${destinationId}/activities`
    );
  }

  createReview(destinationId: number, payload: { rating: number; comment: string }): Observable<{ message: string; review_id: number }> {
    return this.http.post<{ message: string; review_id: number }>(
      `${this.baseUrl}/destinations/${destinationId}/reviews`,
      payload
    );
  }

  updateReview(destinationId: number, reviewId: number, payload: { rating: number; comment: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/destinations/${destinationId}/reviews/${reviewId}`,
      payload
    );
  }

  deleteReview(destinationId: number, reviewId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/destinations/${destinationId}/reviews/${reviewId}`
    );
  }

  compareDestinations(ids: number[]): Observable<CompareResponse> {
    return this.http.get<CompareResponse>(
      `${this.baseUrl}/public/destinations/compare?ids=${ids.join(',')}`
    );
  }

  getTravelOptions(destinationId: number): Observable<TravelResponse> {
    return this.http.get<TravelResponse>(
      `${this.baseUrl}/public/destinations/${destinationId}/travel`
    );
  }

  getAccommodationOptions(destinationId: number): Observable<AccommodationResponse> {
    return this.http.get<AccommodationResponse>(
      `${this.baseUrl}/public/destinations/${destinationId}/accommodations`
    );
  }
}