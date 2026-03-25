import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Destination {
  id: number;
  name: string;
  country: string;
  budget: number;
  description: string;
  is_bookmarked?: boolean;
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

  getDestinationById(id: number): Observable<Destination> {
    return this.http.get<Destination>(`${this.baseUrl}/auth/destinations/${id}`);
  }

  suggestDestinations(query: string): Observable<{id: number, name: string}[]> {
    return this.http.get<{id: number, name: string}[]>(`${this.baseUrl}/auth/destinations/suggest?q=${query}`);
  }
}
