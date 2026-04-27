import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AcceptInviteComponent } from './accept-invite';
import { InviteService, AcceptInviteResponse } from '../../services/invite.service';

const mockInviteService = {
  acceptInvite: vi.fn(),
};

const createRoute = (token: string | null) => ({
  snapshot: { paramMap: { get: (_: string) => token } },
});

describe('AcceptInviteComponent', () => {
  let component: AcceptInviteComponent;
  let fixture: ComponentFixture<AcceptInviteComponent>;
  let router: Router;

  const setup = async (token: string | null, acceptResponse: any) => {
    vi.clearAllMocks();
    mockInviteService.acceptInvite.mockReturnValue(acceptResponse);

    await TestBed.configureTestingModule({
      imports: [AcceptInviteComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: InviteService, useValue: mockInviteService },
        { provide: ActivatedRoute, useValue: createRoute(token) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AcceptInviteComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  // ── Success ────────────────────────────────────────────────────────────────

  it('should show success state when invite accepted', async () => {
    await setup('valid-token', of<AcceptInviteResponse>({ message: 'Invite accepted successfully', trip_id: 10 }));
    expect(component.state).toBe('success');
    expect(component.tripId).toBe(10);
    const el = fixture.nativeElement.querySelector('[data-cy="accept-success"]');
    expect(el).toBeTruthy();
  });

  it('should call acceptInvite with token from route', async () => {
    await setup('my-token-abc', of({ message: 'ok', trip_id: 5 }));
    expect(mockInviteService.acceptInvite).toHaveBeenCalledWith('my-token-abc');
  });

  // ── Error states ───────────────────────────────────────────────────────────

  it('should show expired state on 410 invite_expired', async () => {
    await setup(
      'expired-token',
      throwError(() => ({ status: 410, error: { error: 'invite_expired' } }))
    );
    expect(component.state).toBe('expired');
    const el = fixture.nativeElement.querySelector('[data-cy="accept-expired"]');
    expect(el).toBeTruthy();
  });

  it('should show already_accepted state on 409 already_accepted', async () => {
    await setup(
      'used-token',
      throwError(() => ({ status: 409, error: { error: 'already_accepted' } }))
    );
    expect(component.state).toBe('already_accepted');
    const el = fixture.nativeElement.querySelector('[data-cy="accept-already-accepted"]');
    expect(el).toBeTruthy();
  });

  it('should show already_collaborator state on 409 already_collaborator', async () => {
    await setup(
      'collab-token',
      throwError(() => ({ status: 409, error: { error: 'already_collaborator' } }))
    );
    expect(component.state).toBe('already_collaborator');
    const el = fixture.nativeElement.querySelector('[data-cy="accept-already-collab"]');
    expect(el).toBeTruthy();
  });

  it('should show not_found state on 404', async () => {
    await setup(
      'bad-token',
      throwError(() => ({ status: 404, error: { error: 'not_found' } }))
    );
    expect(component.state).toBe('not_found');
    const el = fixture.nativeElement.querySelector('[data-cy="accept-not-found"]');
    expect(el).toBeTruthy();
  });

  it('should show error state on generic 500', async () => {
    await setup(
      'broken-token',
      throwError(() => ({ status: 500, error: { message: 'Internal error' } }))
    );
    expect(component.state).toBe('error');
    const el = fixture.nativeElement.querySelector('[data-cy="accept-error"]');
    expect(el).toBeTruthy();
  });

  it('should show error state when no token in URL', async () => {
    await setup(null, of({ message: 'ok', trip_id: 1 }));
    expect(component.state).toBe('error');
    // acceptInvite should NOT have been called
    expect(mockInviteService.acceptInvite).not.toHaveBeenCalled();
  });

  it('should redirect to /login on 401', async () => {
    vi.clearAllMocks();
    mockInviteService.acceptInvite.mockReturnValue(
      throwError(() => ({ status: 401, error: { error: 'unauthorized' } }))
    );

    await TestBed.configureTestingModule({
      imports: [AcceptInviteComponent],
      providers: [
        provideRouter([{ path: 'login', redirectTo: '' }]),
        provideAnimations(),
        { provide: InviteService, useValue: mockInviteService },
        { provide: ActivatedRoute, useValue: createRoute('token') },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AcceptInviteComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/login'],
      expect.objectContaining({ queryParams: expect.anything() })
    );
  });

  // ── Navigation methods ─────────────────────────────────────────────────────

  it('goToMyTrips navigates to /my-trips', async () => {
    await setup('token', of({ message: 'ok', trip_id: 1 }));
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.goToMyTrips();
    expect(navigateSpy).toHaveBeenCalledWith(['/my-trips']);
  });

  it('goToTrip navigates to /my-trips when tripId is set', async () => {
    await setup('token', of({ message: 'ok', trip_id: 10 }));
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.tripId = 10;
    component.goToTrip();
    expect(navigateSpy).toHaveBeenCalledWith(['/my-trips']);
  });
});