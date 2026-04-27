import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TripInviteComponent } from './trip-invite';
import {
  InviteService,
  TripInvite,
  SendInviteResponse,
  GetInvitesResponse,
} from '../../services/invite.service';

const mockInvite = (overrides: Partial<TripInvite> = {}): TripInvite => ({
  id: 1,
  trip_id: 10,
  email: 'friend@example.com',
  status: 'pending',
  expires_at: '2026-05-03T00:00:00Z',
  created_at: '2026-04-26T00:00:00Z',
  ...overrides,
});

const mockInviteService = {
  getInvites: vi.fn(() => of<GetInvitesResponse>({ trip_id: 10, invites: [] })),
  sendInvites: vi.fn(() =>
    of<SendInviteResponse>({ message: 'Invites processed', results: [] })
  ),
};

describe('TripInviteComponent', () => {
  let component: TripInviteComponent;
  let fixture: ComponentFixture<TripInviteComponent>;

  // beforeEach creates the component but does NOT call fixture.detectChanges().
  // Each test calls detectChanges() itself so it can configure state/mocks first.
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TripInviteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: InviteService, useValue: mockInviteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripInviteComponent);
    component = fixture.componentInstance;
    component.tripId = 10;
    // NOTE: fixture.detectChanges() is intentionally NOT called here.
    // Each test calls it after setting up any required state/mocks.
  });

  // ── Helper: run standard init (empty invite list) ──────────────────────────
  function init() {
    fixture.detectChanges(); // triggers ngOnInit → loadInvites with empty-list mock
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  it('should create the component', () => {
    init();
    expect(component).toBeTruthy();
  });

  it('should call getInvites on init', () => {
    init();
    expect(mockInviteService.getInvites).toHaveBeenCalledWith(10);
  });

  it('should show empty state when no invites returned', () => {
    init();
    const empty = fixture.nativeElement.querySelector('[data-cy="no-invites"]');
    expect(empty).toBeTruthy();
  });

  // ── Invite display ─────────────────────────────────────────────────────────
  // Mock is configured BEFORE detectChanges() so ngOnInit sees the right data
  // from the start — no state flip mid-cycle, no NG0100.

  it('should render pending invite row with correct status badge', async () => {
    mockInviteService.getInvites.mockReturnValue(
      of({ trip_id: 10, invites: [mockInvite({ status: 'pending' })] })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const row = fixture.nativeElement.querySelector('[data-cy="invite-row-1"]');
    expect(row).toBeTruthy();
    expect(row.querySelector('.status-badge')?.textContent?.trim()).toBe('Pending');
  });

  it('should render accepted invite', async () => {
    mockInviteService.getInvites.mockReturnValue(
      of({ trip_id: 10, invites: [mockInvite({ status: 'accepted' })] })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.textContent?.trim()).toBe('Accepted');
  });

  it('should render expired invite', async () => {
    mockInviteService.getInvites.mockReturnValue(
      of({ trip_id: 10, invites: [mockInvite({ status: 'expired' })] })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.textContent?.trim()).toBe('Expired');
  });

  // ── Email staging ──────────────────────────────────────────────────────────

  it('should add valid email to stagedEmails', () => {
    init();
    component.inviteForm.get('emailInput')?.setValue('test@example.com');
    component.addEmailFromInput();
    expect(component.stagedEmails).toContain('test@example.com');
  });

  it('should not add duplicate email to stagedEmails', () => {
    init();
    component.inviteForm.get('emailInput')?.setValue('test@example.com');
    component.addEmailFromInput();
    component.inviteForm.get('emailInput')?.setValue('test@example.com');
    component.addEmailFromInput();
    expect(component.stagedEmails.length).toBe(1);
  });

  it('should not add invalid email', () => {
    init();
    component.inviteForm.get('emailInput')?.setValue('not-an-email');
    component.addEmailFromInput();
    expect(component.stagedEmails.length).toBe(0);
  });

  it('should remove email chip on removeEmail()', () => {
    init();
    component.stagedEmails = ['a@b.com', 'c@d.com'];
    component.removeEmail('a@b.com');
    expect(component.stagedEmails).not.toContain('a@b.com');
    expect(component.stagedEmails).toContain('c@d.com');
  });

  it('should add email on Enter keydown', () => {
    init();
    component.inviteForm.get('emailInput')?.setValue('enter@test.com');
    component.onInputKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.stagedEmails).toContain('enter@test.com');
  });

  it('should add email on comma keydown', () => {
    init();
    component.inviteForm.get('emailInput')?.setValue('comma@test.com');
    component.onInputKeydown(new KeyboardEvent('keydown', { key: ',' }));
    expect(component.stagedEmails).toContain('comma@test.com');
  });

  // ── Send invites ───────────────────────────────────────────────────────────

  it('should call sendInvites with staged emails', () => {
    init();
    component.stagedEmails = ['a@b.com'];
    component.sendInvites();
    expect(mockInviteService.sendInvites).toHaveBeenCalledWith(10, ['a@b.com']);
  });

  it('should clear stagedEmails after successful send', async () => {
    init();
    mockInviteService.sendInvites.mockReturnValue(
      of({ message: 'Invites processed', results: [{ email: 'a@b.com', status: 'invited' }] })
    );
    component.stagedEmails = ['a@b.com'];
    component.sendInvites();
    await fixture.whenStable();
    expect(component.stagedEmails.length).toBe(0);
  });

  it('should populate lastResults after send', async () => {
    init();
    const results = [
      { email: 'a@b.com', status: 'invited' as const },
      { email: 'bad@', status: 'invalid_email' as const },
    ];
    mockInviteService.sendInvites.mockReturnValue(of({ message: 'ok', results }));
    component.stagedEmails = ['a@b.com', 'bad@'];
    component.sendInvites();
    await fixture.whenStable();
    expect(component.lastResults).toEqual(results);
  });

  it('should not call sendInvites when no staged emails and input empty', () => {
    init();
    component.stagedEmails = [];
    component.inviteForm.get('emailInput')?.setValue('');
    component.sendInvites();
    expect(mockInviteService.sendInvites).not.toHaveBeenCalled();
  });

  it('should set sending=false on HTTP error', () => {
    init();
    // throwError() is synchronous — assert directly without detectChanges()
    // to avoid NG0100 from the state flip inside the checkNoChanges pass.
    mockInviteService.sendInvites.mockReturnValue(throwError(() => new Error('network')));
    component.stagedEmails = ['a@b.com'];
    component.sendInvites();
    expect(component.sending).toBe(false);
  });

  it('should reload invites after successful send', async () => {
    init();
    mockInviteService.sendInvites.mockReturnValue(
      of({ message: 'ok', results: [{ email: 'x@y.com', status: 'invited' }] })
    );
    const callsBefore = mockInviteService.getInvites.mock.calls.length;
    component.stagedEmails = ['x@y.com'];
    component.sendInvites();
    await fixture.whenStable();
    expect(mockInviteService.getInvites.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ── UI helper methods ──────────────────────────────────────────────────────

  it('getStatusIcon returns correct icons', () => {
    init();
    expect(component.getStatusIcon('pending')).toBe('schedule');
    expect(component.getStatusIcon('accepted')).toBe('check_circle');
    expect(component.getStatusIcon('expired')).toBe('timer_off');
  });

  it('getStatusLabel returns correct labels', () => {
    init();
    expect(component.getStatusLabel('pending')).toBe('Pending');
    expect(component.getStatusLabel('accepted')).toBe('Accepted');
    expect(component.getStatusLabel('expired')).toBe('Expired');
  });

  it('getResultLabel maps all result statuses', () => {
    init();
    expect(component.getResultLabel('invited')).toBe('Invite sent');
    expect(component.getResultLabel('already_invited')).toBe('Already invited (pending)');
    expect(component.getResultLabel('already_collaborator')).toBe('Already a collaborator');
    expect(component.getResultLabel('invalid_email')).toBe('Invalid email address');
    expect(component.getResultLabel('error')).toBe('Failed to invite');
  });

  it('isResultSuccess returns true only for invited', () => {
    init();
    expect(component.isResultSuccess('invited')).toBe(true);
    expect(component.isResultSuccess('already_invited')).toBe(false);
    expect(component.isResultSuccess('error')).toBe(false);
  });

  it('isResultWarning returns true for already_invited and already_collaborator', () => {
    init();
    expect(component.isResultWarning('already_invited')).toBe(true);
    expect(component.isResultWarning('already_collaborator')).toBe(true);
    expect(component.isResultWarning('invited')).toBe(false);
  });

  it('isResultError returns true for invalid_email and error', () => {
    init();
    expect(component.isResultError('invalid_email')).toBe(true);
    expect(component.isResultError('error')).toBe(true);
    expect(component.isResultError('invited')).toBe(false);
  });

  it('formatExpiry returns localized date string', () => {
    init();
    expect(component.formatExpiry('2026-05-03T00:00:00Z').length).toBeGreaterThan(0);
  });
});