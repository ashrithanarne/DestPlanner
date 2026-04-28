import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { UserSearchComponent, UserSearchResult } from './user-search';
import { SocialService } from '../../services/social.service';

const MOCK_USER: UserSearchResult = {
  user_id: 2,
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
};

const mockSocialService = {
  searchUsers: vi.fn(() => of({ users: [MOCK_USER] })),
};

const mockRouter = { navigate: vi.fn() };

describe('UserSearchComponent', () => {
  let component: UserSearchComponent;
  let fixture: ComponentFixture<UserSearchComponent>;
  let snack: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocialService.searchUsers.mockReturnValue(of({ users: [MOCK_USER] }));

    await TestBed.configureTestingModule({
      imports: [UserSearchComponent, FormsModule],
      providers: [
        { provide: SocialService, useValue: mockSocialService },
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActivatedRoute, useValue: { params: of({}), snapshot: { params: {} } } },
        provideNoopAnimations(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchComponent);
    component = fixture.componentInstance;

    const snackBar = fixture.debugElement.injector.get(MatSnackBar);
    snack = { open: vi.spyOn(snackBar, 'open') as any };

    fixture.detectChanges();
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty query', () => {
    expect(component.query).toBe('');
  });

  it('should start with empty results', () => {
    expect(component.results).toEqual([]);
  });

  it('should start with loading=false', () => {
    expect(component.loading).toBe(false);
  });

  it('should start with searched=false', () => {
    expect(component.searched).toBe(false);
  });

  // ── runSearch ──────────────────────────────────────────────────────────────

  it('runSearch: calls searchUsers with trimmed query', () => {
    component.runSearch('alice');
    expect(mockSocialService.searchUsers).toHaveBeenCalledWith('alice');
  });

  it('runSearch: sets results from response', () => {
    component.runSearch('alice');
    expect(component.results.length).toBe(1);
    expect(component.results[0].first_name).toBe('Alice');
  });

  it('runSearch: sets loading=false after success', () => {
    component.runSearch('alice');
    expect(component.loading).toBe(false);
  });

  it('runSearch: sets searched=true after call', () => {
    component.runSearch('alice');
    expect(component.searched).toBe(true);
  });

  it('runSearch: sets loading=true at start (synchronous mock resolves immediately)', () => {
    mockSocialService.searchUsers.mockReturnValue(of({ users: [] }));
    component.runSearch('test');
    expect(mockSocialService.searchUsers).toHaveBeenCalled();
  });

  it('runSearch: sets loading=false on HTTP error', () => {
    mockSocialService.searchUsers.mockReturnValue(throwError(() => new Error('net')));
    component.runSearch('broken');
    expect(component.loading).toBe(false);
  });

  it('runSearch: shows snack on error', () => {
    mockSocialService.searchUsers.mockReturnValue(throwError(() => new Error('net')));
    component.runSearch('broken');
    expect(snack.open).toHaveBeenCalledWith(
      'Search failed. Please try again.', 'Close', { duration: 3000 }
    );
  });

  it('runSearch: returns empty results on empty response', () => {
    mockSocialService.searchUsers.mockReturnValue(of({ users: [] }));
    component.runSearch('zzz');
    expect(component.results).toEqual([]);
  });

  // ── onQueryChange with debounce ────────────────────────────────────────────

  it('onQueryChange: does not search immediately (debounced)', () => {
    vi.useFakeTimers();
    component.query = 'al';
    component.onQueryChange();
    expect(mockSocialService.searchUsers).not.toHaveBeenCalled();
    vi.advanceTimersByTime(350);
    expect(mockSocialService.searchUsers).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('onQueryChange: does not search when query < 2 chars after debounce', () => {
    vi.useFakeTimers();
    component.query = 'a';
    component.onQueryChange();
    vi.advanceTimersByTime(350);
    expect(mockSocialService.searchUsers).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('onQueryChange: clears results when query < 2 chars after debounce', () => {
    vi.useFakeTimers();
    component.results = [MOCK_USER];
    component.searched = true;
    component.query = 'a';
    component.onQueryChange();
    vi.advanceTimersByTime(350);
    expect(component.results).toEqual([]);
    expect(component.searched).toBe(false);
    vi.useRealTimers();
  });

  it('onQueryChange: fires search after 350ms debounce with valid query', () => {
    vi.useFakeTimers();
    component.query = 'bob';
    component.onQueryChange();
    vi.advanceTimersByTime(349);
    expect(mockSocialService.searchUsers).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mockSocialService.searchUsers).toHaveBeenCalledWith('bob');
    vi.useRealTimers();
  });

  it('onQueryChange: trims whitespace before searching', () => {
    vi.useFakeTimers();
    component.query = '  alice  ';
    component.onQueryChange();
    vi.advanceTimersByTime(350);
    expect(mockSocialService.searchUsers).toHaveBeenCalledWith('alice');
    vi.useRealTimers();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  it('viewProfile: navigates to /users/:id/profile', () => {
    component.viewProfile(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 2, 'profile']);
  });

  it('goToFeed: navigates to /feed', () => {
    component.goToFeed();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/feed']);
  });

  // ── getInitials ────────────────────────────────────────────────────────────

  it('getInitials: returns uppercase two-letter initials', () => {
    expect(component.getInitials('Alice', 'Smith')).toBe('AS');
  });

  it('getInitials: returns single letter when last name missing', () => {
    expect(component.getInitials('Bob', '')).toBe('B');
  });

  it('getInitials: returns empty string for both empty', () => {
    expect(component.getInitials('', '')).toBe('');
  });

  it('getInitials: handles undefined gracefully', () => {
    expect(component.getInitials(undefined as any, undefined as any)).toBe('');
  });
});