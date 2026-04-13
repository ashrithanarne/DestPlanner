import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TimelineComponent } from './timeline.component';
import {
  TimelineService,
  TimelineResponse,
  TimelineItem,
  TimelineDay,
} from '../../services/timeline.service';

// ── Helpers ───────────────────────────────────────────────────────────────

const makeItem = (o: Partial<TimelineItem> = {}): TimelineItem => ({
  id: 1,
  trip_id: 1,
  title: 'Test Activity',
  activity_type: 'activity',
  date: '2026-06-01',
  sort_order: 1,
  ...o,
});

const makeDay = (items: TimelineItem[] = [], date = '2026-06-01'): TimelineDay => ({
  date,
  day_number: 1,
  items,
});

const makeTimeline = (): TimelineResponse => ({
  trip_id: 1,
  trip_name: 'Paris Adventure',
  start_date: '2026-06-01',
  days: [makeDay([makeItem()])],
});

function makeDragEvent(
  previousIndex: number,
  currentIndex: number,
  items: TimelineItem[]
): CdkDragDrop<TimelineItem[]> {
  return {
    previousIndex,
    currentIndex,
    item: { data: items[previousIndex] } as any,
    container: { data: items } as any,
    previousContainer: { data: items } as any,
    isPointerOverContainer: true,
    distance: { x: 0, y: 0 },
    dropPoint: { x: 0, y: 0 },
    event: new MouseEvent('drop'),
  };
}

// ── Shared setup helper ───────────────────────────────────────────────────

function buildComponent(platformId = 'browser', serviceOverrides: any = {}, routeParams = { tripId: '1' }) {
  const timelineServiceMock = {
    timeline$: new BehaviorSubject<TimelineResponse | null>(null).asObservable(),
    getTimeline: vi.fn(() => of(makeTimeline())),
    createItem: vi.fn(() => of({ item_id: 99 })),
    updateItem: vi.fn(() => of({})),
    deleteItem: vi.fn(() => of({})),
    reorderItem: vi.fn(() => of({})),
    getActivityColor: vi.fn((_t: string) => '#000000'),
    getActivityIcon: vi.fn((_t: string) => 'event'),
    ...serviceOverrides,
  };

  const routerMock = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [TimelineComponent, ReactiveFormsModule, NoopAnimationsModule],
    providers: [
      { provide: TimelineService, useValue: timelineServiceMock },
      { provide: Router, useValue: routerMock },
      { provide: ActivatedRoute, useValue: { params: of(routeParams) } },
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });

  const fixture = TestBed.createComponent(TimelineComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  const snackBar = fixture.debugElement.injector.get(MatSnackBar);
  const snack = { open: vi.spyOn(snackBar, 'open') };

  return {
    component,
    fixture,
    timelineService: timelineServiceMock,
    snack,
    router: routerMock,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('TimelineComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── Creation ──────────────────────────────────────────────────────

  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ──────────────────────────────────────────────────────

  it('ngOnInit: should parse tripId from route params', () => {
    const { component } = buildComponent();
    expect(component.tripId).toBe(1);
  });

  it('ngOnInit: should call getTimeline on init (browser)', () => {
    const { timelineService } = buildComponent();
    expect(timelineService.getTimeline).toHaveBeenCalledWith(1);
  });

  it('ngOnInit: should NOT call getTimeline on server platform', () => {
    const { timelineService } = buildComponent('server');
    expect(timelineService.getTimeline).not.toHaveBeenCalled();
  });

  it('ngOnInit: should navigate to /my-trips when tripId is missing/zero', () => {
    const { router } = buildComponent('browser', {}, { tripId: '0' });
    expect(router.navigate).toHaveBeenCalledWith(['/my-trips']);
  });

  it('ngOnInit: should initialise itemForm with default activity_type of activity', () => {
    const { component } = buildComponent();
    expect(component.itemForm.get('activity_type')?.value).toBe('activity');
  });

  it('ngOnInit: should start with viewMode timeline', () => {
    const { component } = buildComponent();
    expect(component.viewMode).toBe('timeline');
  });

  // ── loadTimeline ──────────────────────────────────────────────────

  it('loadTimeline: should set loading to false after success', () => {
    const { component } = buildComponent();
    component.loadTimeline();
    expect(component.loading).toBe(false);
  });

  it('loadTimeline: should navigate to /my-trips on 404 error', () => {
    const { component, router, timelineService } = buildComponent();
    timelineService.getTimeline.mockReturnValue(throwError(() => ({ status: 404 })));
    component.loadTimeline();
    expect(router.navigate).toHaveBeenCalledWith(['/my-trips']);
  });

  it('loadTimeline: should show snack on non-404 error', () => {
    const { component, snack, timelineService } = buildComponent();
    timelineService.getTimeline.mockReturnValue(throwError(() => ({ status: 500 })));
    component.loadTimeline();
    expect(snack.open).toHaveBeenCalledWith('Failed to load timeline', 'Close', { duration: 3000 });
  });

  it('loadTimeline: should set loading to false even on error', () => {
    const { component, timelineService } = buildComponent();
    timelineService.getTimeline.mockReturnValue(throwError(() => ({ status: 500 })));
    component.loadTimeline();
    expect(component.loading).toBe(false);
  });

  // ── openAddForm ───────────────────────────────────────────────────

  it('openAddForm: should set showAddForm to true', () => {
    const { component } = buildComponent();
    component.openAddForm();
    expect(component.showAddForm).toBe(true);
  });

  it('openAddForm: should clear editingItem', () => {
    const { component } = buildComponent();
    component.editingItem = makeItem();
    component.openAddForm();
    expect(component.editingItem).toBeNull();
  });

  it('openAddForm: should patch date into form when day is provided', () => {
    const { component } = buildComponent();
    component.openAddForm(makeDay([], '2026-07-15'));
    expect(component.itemForm.get('date')?.value).toBe('2026-07-15');
  });

  it('openAddForm: should NOT set date when no day provided', () => {
    const { component } = buildComponent();
    component.openAddForm();
    expect(component.itemForm.get('date')?.value).toBeFalsy();
  });

  it('openAddForm: should reset activity_type to activity', () => {
    const { component } = buildComponent();
    component.itemForm.patchValue({ activity_type: 'travel' });
    component.openAddForm();
    expect(component.itemForm.get('activity_type')?.value).toBe('activity');
  });

  // ── openEditForm ──────────────────────────────────────────────────

  it('openEditForm: should set editingItem', () => {
    const { component } = buildComponent();
    const item = makeItem({ id: 5, title: 'Louvre Museum' });
    component.openEditForm(item);
    expect(component.editingItem).toEqual(item);
  });

  it('openEditForm: should patch form with item title', () => {
    const { component } = buildComponent();
    component.openEditForm(makeItem({ title: 'Eiffel Tower' }));
    expect(component.itemForm.get('title')?.value).toBe('Eiffel Tower');
  });

  it('openEditForm: should patch form with item location', () => {
    const { component } = buildComponent();
    component.openEditForm(makeItem({ location: 'Paris, France' }));
    expect(component.itemForm.get('location')?.value).toBe('Paris, France');
  });

  it('openEditForm: should patch form with item activity_type', () => {
    const { component } = buildComponent();
    component.openEditForm(makeItem({ activity_type: 'dining' }));
    expect(component.itemForm.get('activity_type')?.value).toBe('dining');
  });

  it('openEditForm: should patch form with item date', () => {
    const { component } = buildComponent();
    component.openEditForm(makeItem({ date: '2026-06-03' }));
    expect(component.itemForm.get('date')?.value).toBe('2026-06-03');
  });

  it('openEditForm: should set showAddForm to true', () => {
    const { component } = buildComponent();
    component.openEditForm(makeItem());
    expect(component.showAddForm).toBe(true);
  });

  // ── closeForm ─────────────────────────────────────────────────────

  it('closeForm: should set showAddForm to false', () => {
    const { component } = buildComponent();
    component.showAddForm = true;
    component.closeForm();
    expect(component.showAddForm).toBe(false);
  });

  it('closeForm: should clear editingItem', () => {
    const { component } = buildComponent();
    component.editingItem = makeItem();
    component.closeForm();
    expect(component.editingItem).toBeNull();
  });

  it('closeForm: should reset form activity_type to activity', () => {
    const { component } = buildComponent();
    component.itemForm.patchValue({ activity_type: 'travel' });
    component.closeForm();
    expect(component.itemForm.get('activity_type')?.value).toBe('activity');
  });

  // ── saveItem (create) ─────────────────────────────────────────────

  it('saveItem: should NOT call createItem when form is invalid', () => {
    const { component, timelineService } = buildComponent();
    component.itemForm.reset();
    timelineService.createItem.mockClear();
    component.saveItem();
    expect(timelineService.createItem).not.toHaveBeenCalled();
  });

  it('saveItem: should call createItem with tripId and form value', () => {
    const { component, timelineService } = buildComponent();
    component.itemForm.patchValue({ title: 'Lunch', activity_type: 'dining', date: '2026-06-01' });
    const expectedValue = component.itemForm.value;
    timelineService.createItem.mockClear();
    component.saveItem();
    expect(timelineService.createItem).toHaveBeenCalledWith(1, expectedValue);
  });

  it('saveItem: should close form after successful create', () => {
    const { component } = buildComponent();
    component.showAddForm = true;
    component.itemForm.patchValue({ title: 'Lunch', activity_type: 'dining', date: '2026-06-01' });
    component.saveItem();
    expect(component.showAddForm).toBe(false);
  });

  it('saveItem: should reload timeline after successful create', () => {
    const { component, timelineService } = buildComponent();
    component.itemForm.patchValue({ title: 'Museum', activity_type: 'activity', date: '2026-06-01' });
    timelineService.getTimeline.mockClear();
    component.saveItem();
    expect(timelineService.getTimeline).toHaveBeenCalledWith(1);
  });

  it('saveItem: should show "Item added" snack on create success', () => {
    const { component, snack } = buildComponent();
    component.itemForm.patchValue({ title: 'Museum', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(snack.open).toHaveBeenCalledWith('Item added', 'Close', { duration: 2000 });
  });

  it('saveItem: should show error snack on create failure', () => {
    const { component, snack, timelineService } = buildComponent();
    timelineService.createItem.mockReturnValue(throwError(() => ({})));
    component.itemForm.patchValue({ title: 'Museum', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(snack.open).toHaveBeenCalledWith('Failed to add item', 'Close', { duration: 3000 });
  });

  it('saveItem: should reset saving to false on create error', () => {
    const { component, timelineService } = buildComponent();
    timelineService.createItem.mockReturnValue(throwError(() => ({})));
    component.itemForm.patchValue({ title: 'Museum', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(component.saving).toBe(false);
  });

  // ── saveItem (update) ─────────────────────────────────────────────

  it('saveItem: should call updateItem when editingItem is set', () => {
    const { component, timelineService } = buildComponent();
    component.editingItem = makeItem({ id: 7 });
    component.itemForm.patchValue({ title: 'Updated', activity_type: 'activity', date: '2026-06-01' });
    const expectedValue = component.itemForm.value;
    component.saveItem();
    expect(timelineService.updateItem).toHaveBeenCalledWith(1, 7, expectedValue);
  });

  it('saveItem: should show "Item updated" snack on update success', () => {
    const { component, snack } = buildComponent();
    component.editingItem = makeItem({ id: 7 });
    component.itemForm.patchValue({ title: 'Updated', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(snack.open).toHaveBeenCalledWith('Item updated', 'Close', { duration: 2000 });
  });

  it('saveItem: should show error snack on update failure', () => {
    const { component, snack, timelineService } = buildComponent();
    timelineService.updateItem.mockReturnValue(throwError(() => ({})));
    component.editingItem = makeItem({ id: 7 });
    component.itemForm.patchValue({ title: 'Updated', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(snack.open).toHaveBeenCalledWith('Failed to update item', 'Close', { duration: 3000 });
  });

  it('saveItem: should close form after successful update', () => {
    const { component } = buildComponent();
    component.editingItem = makeItem({ id: 7 });
    component.showAddForm = true;
    component.itemForm.patchValue({ title: 'Updated', activity_type: 'activity', date: '2026-06-01' });
    component.saveItem();
    expect(component.showAddForm).toBe(false);
  });

  // ── deleteItem ────────────────────────────────────────────────────

  it('deleteItem: should NOT call service when user cancels confirm', () => {
    const { component, timelineService } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteItem(makeItem({ id: 3 }));
    expect(timelineService.deleteItem).not.toHaveBeenCalled();
  });

  it('deleteItem: should call deleteItem service when confirmed', () => {
    const { component, timelineService } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(makeItem({ id: 3 }));
    expect(timelineService.deleteItem).toHaveBeenCalledWith(1, 3);
  });

  it('deleteItem: should show "Item deleted" snack on success', () => {
    const { component, snack } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(makeItem({ id: 3 }));
    expect(snack.open).toHaveBeenCalledWith('Item deleted', 'Close', { duration: 2000 });
  });

  it('deleteItem: should reload timeline after successful delete', () => {
    const { component, timelineService } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    timelineService.getTimeline.mockClear();
    component.deleteItem(makeItem({ id: 3 }));
    expect(timelineService.getTimeline).toHaveBeenCalledWith(1);
  });

  it('deleteItem: should reset deletingItemId to null after success', () => {
    const { component } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(makeItem({ id: 3 }));
    expect(component.deletingItemId).toBeNull();
  });

  it('deleteItem: should show error snack on failure', () => {
    const { component, snack, timelineService } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    timelineService.deleteItem.mockReturnValue(throwError(() => ({})));
    component.deleteItem(makeItem({ id: 3 }));
    expect(snack.open).toHaveBeenCalledWith('Failed to delete item', 'Close', { duration: 3000 });
  });

  it('deleteItem: should reset deletingItemId to null on error', () => {
    const { component, timelineService } = buildComponent();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    timelineService.deleteItem.mockReturnValue(throwError(() => ({})));
    component.deleteItem(makeItem({ id: 3 }));
    expect(component.deletingItemId).toBeNull();
  });

  // ── dropItem ──────────────────────────────────────────────────────

  it('dropItem: should call reorderItem when indices differ', () => {
    const { component, timelineService } = buildComponent();
    const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
    const day = makeDay(items);
    const event = makeDragEvent(0, 1, items);
    component.dropItem(event, day);
    expect(timelineService.reorderItem).toHaveBeenCalledWith(
      1, 1, { date: '2026-06-01', new_position: 2 }
    );
  });

  it('dropItem: should NOT call reorderItem when dropped at same position', () => {
    const { component, timelineService } = buildComponent();
    const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
    const day = makeDay(items);
    const event = makeDragEvent(0, 0, items);
    timelineService.reorderItem.mockClear();
    component.dropItem(event, day);
    expect(timelineService.reorderItem).not.toHaveBeenCalled();
  });

  it('dropItem: should reload timeline after successful reorder', () => {
    const { component, timelineService } = buildComponent();
    const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
    const day = makeDay(items);
    timelineService.getTimeline.mockClear();
    component.dropItem(makeDragEvent(0, 1, items), day);
    expect(timelineService.getTimeline).toHaveBeenCalledWith(1);
  });

  it('dropItem: should show error snack on reorder failure', () => {
    const { component, snack, timelineService } = buildComponent();
    timelineService.reorderItem.mockReturnValue(throwError(() => ({})));
    const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
    component.dropItem(makeDragEvent(0, 1, items), makeDay(items));
    expect(snack.open).toHaveBeenCalledWith(
      'Failed to reorder item', 'Close', { duration: 3000 }
    );
  });

  // ── toggleViewMode ────────────────────────────────────────────────

  it('toggleViewMode: should switch from timeline to list', () => {
    const { component } = buildComponent();
    component.viewMode = 'timeline';
    component.toggleViewMode();
    expect(component.viewMode).toBe('list');
  });

  it('toggleViewMode: should switch from list to timeline', () => {
    const { component } = buildComponent();
    component.viewMode = 'list';
    component.toggleViewMode();
    expect(component.viewMode).toBe('timeline');
  });

  // ── getTypeLabel ──────────────────────────────────────────────────

  it('getTypeLabel: should return Travel for travel', () => {
    const { component } = buildComponent();
    expect(component.getTypeLabel('travel')).toBe('Travel');
  });

  it('getTypeLabel: should return Hotel for accommodation', () => {
    const { component } = buildComponent();
    expect(component.getTypeLabel('accommodation')).toBe('Hotel');
  });

  it('getTypeLabel: should return Activity for activity', () => {
    const { component } = buildComponent();
    expect(component.getTypeLabel('activity')).toBe('Activity');
  });

  it('getTypeLabel: should return Dining for dining', () => {
    const { component } = buildComponent();
    expect(component.getTypeLabel('dining')).toBe('Dining');
  });

  it('getTypeLabel: should return Other for other', () => {
    const { component } = buildComponent();
    expect(component.getTypeLabel('other')).toBe('Other');
  });

  // ── trackByDay / trackByItem ──────────────────────────────────────

  it('trackByDay: should return day.date', () => {
    const { component } = buildComponent();
    expect(component.trackByDay(0, makeDay([], '2026-06-05'))).toBe('2026-06-05');
  });

  it('trackByItem: should return item.id', () => {
    const { component } = buildComponent();
    expect(component.trackByItem(0, makeItem({ id: 99 }))).toBe(99);
  });
});