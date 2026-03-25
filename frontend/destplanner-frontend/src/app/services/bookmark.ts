import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BookmarkResponse {
  id: number;
  destination: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  addBookmark(destinationId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.baseUrl}/bookmarks`, { destination_id: destinationId });
  }

  getBookmarks(): Observable<BookmarkResponse[]> {
    return this.http.get<BookmarkResponse[]>(`${this.baseUrl}/bookmarks`);
  }

  removeBookmark(bookmarkId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.baseUrl}/bookmarks/${bookmarkId}`);
  }
}
