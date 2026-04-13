import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export type ActivityType = 'travel' | 'accommodation' | 'activity' | 'dining' | 'other';

export interface TimelineItem {
  id: number;
  trip_id: number;
  title: string;
  description?: string;
  activity_type: ActivityType;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  sort_order: number;
}

export interface TimelineDay {
  date: string;
  day_number: number;
  items: TimelineItem[];
}

export interface TimelineResponse {
  trip_id: number;
  trip_name: string;
  start_date: string;
  days: TimelineDay[];
}

export interface CreateTimelineItemPayload {
  title: string;
  description?: string;
  activity_type: ActivityType;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

export interface ReorderPayload {
  date: string;
  new_position: number;
}

@Injectable({ providedIn: 'root' })
export class TimelineService {
  private readonly baseUrl = 'http://localhost:8080/api';
  private _timeline$ = new BehaviorSubject<TimelineResponse | null>(null);
  readonly timeline$ = this._timeline$.asObservable();

  constructor(private http: HttpClient) {}

  getTimeline(tripId: number): Observable<TimelineResponse> {
    return this.http
      .get<TimelineResponse>(`${this.baseUrl}/trips/${tripId}/timeline`)
      .pipe(tap(res => this._timeline$.next(res)));
  }

  createItem(
    tripId: number,
    payload: CreateTimelineItemPayload
  ): Observable<{ item_id: number }> {
    return this.http.post<{ item_id: number }>(
      `${this.baseUrl}/trips/${tripId}/timeline/items`,
      payload
    );
  }

  updateItem(
    tripId: number,
    itemId: number,
    payload: Partial<CreateTimelineItemPayload>
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/trips/${tripId}/timeline/items/${itemId}`,
      payload
    );
  }

  deleteItem(tripId: number, itemId: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/trips/${tripId}/timeline/items/${itemId}`
    );
  }

  reorderItem(
    tripId: number,
    itemId: number,
    payload: ReorderPayload
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/trips/${tripId}/timeline/items/${itemId}/reorder`,
      payload
    );
  }

  setTimeline(data: TimelineResponse | null): void {
    this._timeline$.next(data);
  }

  getActivityColor(type: ActivityType): string {
    const map: Record<ActivityType, string> = {
      travel: '#3b82f6',
      accommodation: '#8b5cf6',
      activity: '#10b981',
      dining: '#f59e0b',
      other: '#6b7280',
    };
    return map[type] ?? map['other'];
  }

  getActivityIcon(type: ActivityType): string {
    const map: Record<ActivityType, string> = {
      travel: 'flight',
      accommodation: 'hotel',
      activity: 'hiking',
      dining: 'restaurant',
      other: 'event',
    };
    return map[type] ?? 'event';
  }
}
