import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TripInvite {
  id: number;
  trip_id: number;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface InviteResult {
  email: string;
  status:
    | 'invited'
    | 'already_invited'
    | 'already_collaborator'
    | 'invalid_email'
    | 'error';
}

export interface SendInviteRequest {
  emails: string[];
}

export interface SendInviteResponse {
  message: string;
  results: InviteResult[];
}

export interface GetInvitesResponse {
  trip_id: number;
  invites: TripInvite[];
}

export interface AcceptInviteResponse {
  message: string;
  trip_id: number;
}

@Injectable({ providedIn: 'root' })
export class InviteService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** POST /api/trips/:id/invite */
  sendInvites(tripId: number, emails: string[]): Observable<SendInviteResponse> {
    return this.http.post<SendInviteResponse>(
      `${this.base}/trips/${tripId}/invite`,
      { emails }
    );
  }

  /** GET /api/trips/:id/invites */
  getInvites(tripId: number): Observable<GetInvitesResponse> {
    return this.http.get<GetInvitesResponse>(`${this.base}/trips/${tripId}/invites`);
  }

  /** POST /api/invites/:token/accept */
  acceptInvite(token: string): Observable<AcceptInviteResponse> {
    return this.http.post<AcceptInviteResponse>(
      `${this.base}/invites/${token}/accept`,
      {}
    );
  }
}