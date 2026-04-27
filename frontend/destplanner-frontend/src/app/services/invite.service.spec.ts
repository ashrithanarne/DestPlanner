import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  InviteService,
  TripInvite,
  SendInviteResponse,
  GetInvitesResponse,
  AcceptInviteResponse,
} from './invite.service';

describe('InviteService', () => {
  let service: InviteService;
  let httpMock: HttpTestingController;

  // Matches environment.development.ts apiUrl used at test-time
  const BASE = 'http://localhost:8080/api';

  const mockInvite = (overrides: Partial<TripInvite> = {}): TripInvite => ({
    id: 1,
    trip_id: 10,
    email: 'friend@example.com',
    status: 'pending',
    expires_at: '2026-05-03T00:00:00Z',
    created_at: '2026-04-26T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InviteService],
    });
    service = TestBed.inject(InviteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── sendInvites ────────────────────────────────────────────────────────────

  it('sendInvites: POSTs to /trips/:id/invite with email list', () => {
    const resp: SendInviteResponse = {
      message: 'Invites processed',
      results: [{ email: 'a@b.com', status: 'invited' }],
    };

    service.sendInvites(10, ['a@b.com']).subscribe((r) => {
      expect(r.message).toBe('Invites processed');
      expect(r.results[0].status).toBe('invited');
    });

    const req = httpMock.expectOne(`${BASE}/trips/10/invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ emails: ['a@b.com'] });
    req.flush(resp);
  });

  it('sendInvites: sends multiple emails in one request', () => {
    const emails = ['a@b.com', 'c@d.com'];
    service.sendInvites(10, emails).subscribe();
    const req = httpMock.expectOne(`${BASE}/trips/10/invite`);
    expect(req.request.body.emails).toEqual(emails);
    req.flush({ message: 'ok', results: [] });
  });

  it('sendInvites: returns already_invited for duplicate pending', () => {
    const resp: SendInviteResponse = {
      message: 'Invites processed',
      results: [{ email: 'a@b.com', status: 'already_invited' }],
    };

    service.sendInvites(10, ['a@b.com']).subscribe((r) => {
      expect(r.results[0].status).toBe('already_invited');
    });

    httpMock.expectOne(`${BASE}/trips/10/invite`).flush(resp);
  });

  it('sendInvites: propagates HTTP errors', () => {
    let caught = false;
    service.sendInvites(10, ['a@b.com']).subscribe({
      error: () => (caught = true),
    });
    httpMock.expectOne(`${BASE}/trips/10/invite`).flush(
      { error: 'forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(caught).toBe(true);
  });

  // ── getInvites ─────────────────────────────────────────────────────────────

  it('getInvites: GETs /trips/:id/invites', () => {
    const resp: GetInvitesResponse = { trip_id: 10, invites: [mockInvite()] };

    service.getInvites(10).subscribe((r) => {
      expect(r.trip_id).toBe(10);
      expect(r.invites.length).toBe(1);
      expect(r.invites[0].email).toBe('friend@example.com');
    });

    const req = httpMock.expectOne(`${BASE}/trips/10/invites`);
    expect(req.request.method).toBe('GET');
    req.flush(resp);
  });

  it('getInvites: returns empty list when no invites', () => {
    service.getInvites(5).subscribe((r) => {
      expect(r.invites).toEqual([]);
    });
    httpMock.expectOne(`${BASE}/trips/5/invites`).flush({ trip_id: 5, invites: [] });
  });

  it('getInvites: propagates 403 for non-owner', () => {
    let error: any;
    service.getInvites(10).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${BASE}/trips/10/invites`).flush(
      { error: 'forbidden' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(error.status).toBe(403);
  });

  // ── acceptInvite ───────────────────────────────────────────────────────────

  it('acceptInvite: POSTs to /invites/:token/accept with empty body', () => {
    const resp: AcceptInviteResponse = { message: 'Invite accepted successfully', trip_id: 10 };

    service.acceptInvite('test-token-123').subscribe((r) => {
      expect(r.message).toBe('Invite accepted successfully');
      expect(r.trip_id).toBe(10);
    });

    const req = httpMock.expectOne(`${BASE}/invites/test-token-123/accept`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(resp);
  });

  it('acceptInvite: propagates 410 Gone for expired invite', () => {
    let error: any;
    service.acceptInvite('expired-token').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${BASE}/invites/expired-token/accept`).flush(
      { error: 'invite_expired', message: 'This invite link has expired' },
      { status: 410, statusText: 'Gone' }
    );
    expect(error.status).toBe(410);
    expect(error.error.error).toBe('invite_expired');
  });

  it('acceptInvite: propagates 409 Conflict for already accepted', () => {
    let error: any;
    service.acceptInvite('used-token').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${BASE}/invites/used-token/accept`).flush(
      { error: 'already_accepted' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(error.status).toBe(409);
  });

  it('acceptInvite: propagates 404 for unknown token', () => {
    let error: any;
    service.acceptInvite('bad-token').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${BASE}/invites/bad-token/accept`).flush(
      { error: 'not_found' },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.status).toBe(404);
  });

  it('acceptInvite: propagates 401 for unauthenticated user', () => {
    let error: any;
    service.acceptInvite('token').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${BASE}/invites/token/accept`).flush(
      { error: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );
    expect(error.status).toBe(401);
  });
});