import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PackingItem {
  id: number;
  packing_list_id: number;
  item_name: string;
  category: string;
  quantity: number;
  is_checked: boolean;
  is_suggested: boolean;
  notes: string;
  created_at: string;
}

export interface PackingListData {
  id: number;
  trip_id: number;
  user_id: number;
  destination: string;
  climate: string;
  duration_days: number;
  items: PackingItem[];
  total_items: number;
  checked_items: number;
  percent_complete: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePackingListPayload {
  trip_id: number;
  destination?: string;
  climate?: string;
  duration_days?: number;
  auto_populate?: boolean;
}

export interface AddItemPayload {
  item_name: string;
  category?: string;
  quantity?: number;
  notes?: string;
}

export interface UpdateItemPayload {
  item_name?: string;
  category?: string;
  quantity?: number;
  is_checked?: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PackingListService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  create(payload: CreatePackingListPayload): Observable<{ message: string; packing_list_id: number }> {
    return this.http.post<any>(`${this.api}/trips/${payload.trip_id}/packing-list`, payload);
  }

  get(tripId: number): Observable<PackingListData> {
    return this.http.get<PackingListData>(`${this.api}/trips/${tripId}/packing-list`);
  }

  addItem(tripId: number, payload: AddItemPayload): Observable<{ message: string; item_id: number }> {
    return this.http.post<any>(`${this.api}/trips/${tripId}/packing-list/items`, payload);
  }

  updateItem(itemId: number, payload: UpdateItemPayload): Observable<{ message: string }> {
    return this.http.put<any>(`${this.api}/packing-items/${itemId}`, payload);
  }

  deleteItem(itemId: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${this.api}/packing-items/${itemId}`);
  }

  deleteList(tripId: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${this.api}/trips/${tripId}/packing-list`);
  }
}