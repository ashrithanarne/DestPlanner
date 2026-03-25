import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ItineraryItem {
  id?: number;
  time: string;
  activity: string;
  location?: string;
  notes?: string;
}

export interface Itinerary {
  id: number;
  name: string;
  owner?: number;
  items?: ItineraryItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ItineraryService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // POST /itineraries
  createItinerary(data: any): Observable<Itinerary> {
    return this.http.post<Itinerary>(`${this.baseUrl}/itineraries`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // GET /itineraries/{id}
  getItinerary(id: number): Observable<Itinerary> {
    return this.http.get<Itinerary>(`${this.baseUrl}/itineraries/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // PUT /itineraries/{id}
  updateItinerary(id: number, data: any): Observable<Itinerary> {
    return this.http.put<Itinerary>(`${this.baseUrl}/itineraries/${id}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // DELETE /itineraries/{id}/items/{itemId}
  deleteItineraryItem(id: number, itemId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/itineraries/${id}/items/${itemId}`).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
