import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Trip {
  id: number;
  user_id: number;
  trip_name: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  status: string;
  duration_days?: number;
  packing_progress?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTripPayload {
  trip_name: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateTripPayload {
  trip_name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private baseUrl = environment.apiUrl;

  private tripsSubject = new BehaviorSubject<Trip[]>([]);
  trips$ = this.tripsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // GET /api/trips  (optional ?status filter)
  getTrips(status?: string): Observable<{ trips: Trip[] }> {
    const url = status
      ? `${this.baseUrl}/trips?status=${status}`
      : `${this.baseUrl}/trips`;
    return this.http.get<{ trips: Trip[] }>(url).pipe(
      tap((res) => this.tripsSubject.next(res.trips ?? []))
    );
  }

  // GET /api/trips/:id
  getTripById(id: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.baseUrl}/trips/${id}`);
  }

  // POST /api/trips
  createTrip(payload: CreateTripPayload): Observable<{ message: string; trip_id: number }> {
    return this.http.post<{ message: string; trip_id: number }>(
      `${this.baseUrl}/trips`, payload
    );
  }

  // PUT /api/trips/:id
  updateTrip(id: number, payload: UpdateTripPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/trips/${id}`, payload);
  }

  // DELETE /api/trips/:id
  deleteTrip(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/trips/${id}`);
  }
}