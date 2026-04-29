import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnalyticsSummary {
  total_trips: number;
  total_spent: number;
  total_budgets: number;
  average_spent_per_trip: number;
  countries_visited: number;
}

export interface AnalyticsSummaryResponse {
  user_id: number;
  summary: AnalyticsSummary;
}

export interface AnalyticsTrip {
  id: number;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  total_cost: number;
}

export interface AnalyticsTripsResponse {
  user_id: number;
  total_trips: number;
  trips: AnalyticsTrip[];
}

export interface AnalyticsExpenseCategory {
  category: string;
  total_amount: number;
  count: number;
}

export interface AnalyticsExpensesResponse {
  user_id: number;
  total_spent: number;
  categories: AnalyticsExpenseCategory[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<AnalyticsSummaryResponse> {
    return this.http.get<AnalyticsSummaryResponse>(`${this.baseUrl}/analytics/summary`);
  }

  getTrips(): Observable<AnalyticsTripsResponse> {
    return this.http.get<AnalyticsTripsResponse>(`${this.baseUrl}/analytics/trips`);
  }

  getExpenses(tripId?: number, dateRange?: string): Observable<AnalyticsExpensesResponse> {
    const params: string[] = [];
    if (tripId) params.push(`tripId=${tripId}`);
    if (dateRange) params.push(`dateRange=${dateRange}`);
    const query = params.length > 0 ? '?' + params.join('&') : '';
    return this.http.get<AnalyticsExpensesResponse>(`${this.baseUrl}/analytics/expenses${query}`);
  }
}
