import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PackingListComponent } from './packing-list';
import { PackingListService, PackingListData, PackingItem } from '../../services/packing-list';
import { TripService, Trip } from '../../services/trip.service';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TRIP: Trip = {
  id: 2, user_id: 1,
  trip_name: 'Europe Trip', destination: 'Europe',
  start_date: '2025-08-01', end_date: '2025-08-10',
  notes: '', status: 'planning',
  duration_days: 9, packing_progress: 0,
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

const ITEM_CLOTHING: PackingItem = {
  id: 1, packing_list_id: 10, item_name: 'Winter coat',
  category: 'Clothing', quantity: 1,
  is_checked: false, is_suggested: true, notes: '',
  created_at: '2025-01-01',
};

const ITEM_ACCESSORIES: PackingItem = {
  id: 2, packing_list_id: 10, item_name: 'Warm hat',
  category: 'Accessories', quantity: 1,
  is_checked: true, is_suggested: true, notes: '',
  created_at: '2025-01-01',
};

const MOCK_DATA: PackingListData = {
  id: 10, trip_id: 2, user_id: 1,
  destination: 'Europe', climate: 'cold', duration_days: 9,
  total_items: 2, checked_items: 1, percent_complete: 50,
  items: [ITEM_CLOTHING, ITEM_ACCESSORIES],
  created_at: '2025-01-01', updated_at: '2025-01-01',
};

// ── Setup helper ──────────────────────────────────────────────────────────────

function makeActivatedRoute(tripIdParam: string) {
  return {
    snapshot: {
      paramMap: convertToParamMap({ tripId: tripIdParam }),
    },
  };
}

function setup(
  packingOverrides: Partial<Record<string, any>> = {},
  tripOverrides: Partial<Record<string, any>> = {},
  tripIdParam = '2',
) {
  const packingSpy = {
    get:        vi.fn().mockReturnValue(of(MOCK_DATA)),
    create:     vi.fn().mockReturnValue(of({ message: 'created' })),
    addItem:    vi.fn().mockReturnValue(of({ message: 'added' })),
    updateItem: vi.fn().mockReturnValue(of({ message: 'updated' })),
    deleteItem: vi.fn().mockReturnValue(of({ message: 'deleted' })),
    deleteList: vi.fn().mockReturnValue(of({ message: 'deleted' })),
    ...packingOverrides,
  };

  const tripSpy = {
    getTripById: vi.fn().mockReturnValue(of(MOCK_TRIP)),
    ...tripOverrides,
  };

  const routerSpy = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [PackingListComponent, NoopAnimationsModule],
    providers: [
      { provide: PackingListService, useValue: packingSpy },
      { provide: TripService,        useValue: tripSpy },
      { provide: Router,             useValue: routerSpy },
      { provide: ActivatedRoute,     useValue: makeActivatedRoute(tripIdParam) },
      { provide: PLATFORM_ID,        useValue: 'browser' },
    ],
  });

  const fixture   = TestBed.createComponent(PackingListComponent);
  const component = fixture.componentInstance;

  // Spy on the real MatSnackBar from the component's own child injector
  // IMPORTANT: Create spy BEFORE detectChanges so it captures ngOnInit calls
  const snack = fixture.debugElement.injector.get(MatSnackBar);
  const snackSpy = vi.spyOn(snack, 'open');

  fixture.detectChanges();

  return { fixture, component, packingSpy, tripSpy, routerSpy, snackSpy };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PackingListComponent', () => {

  beforeEach(() => TestBed.resetTestingModule());

  // ── ngOnInit ─────────────────────────────────────────────────────────────

  it('ngOnInit: should load trip and packing list on init', () => {
    const { tripSpy, packingSpy } = setup();
    expect(tripSpy.getTripById).toHaveBeenCalledWith(2);
    expect(packingSpy.get).toHaveBeenCalledWith(2);
  });

  it('ngOnInit: should set tripId from route param', () => {
    const { component } = setup();
    expect(component.tripId).toBe(2);
  });

  it('ngOnInit: should set createDuration from trip duration_days', () => {
    const { component } = setup();
    expect(component.createDuration).toBe(9);
  });

  it('ngOnInit: should redirect to /my-trips when tripId is missing', () => {
    const { routerSpy } = setup({}, {}, '');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/my-trips']);
  });

  it('ngOnInit: should not load data on server platform', () => {
    const packingSpy = { get: vi.fn(), create: vi.fn(), addItem: vi.fn(), updateItem: vi.fn(), deleteItem: vi.fn(), deleteList: vi.fn() };
    const tripSpy    = { getTripById: vi.fn() };

    TestBed.configureTestingModule({
      imports: [PackingListComponent, NoopAnimationsModule],
      providers: [
        { provide: PackingListService, useValue: packingSpy },
        { provide: TripService,        useValue: tripSpy },
        { provide: Router,             useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute,     useValue: makeActivatedRoute('2') },
        { provide: PLATFORM_ID,        useValue: 'server' },
      ],
    });
    const fixture = TestBed.createComponent(PackingListComponent);
    fixture.detectChanges();
    expect(packingSpy.get).not.toHaveBeenCalled();
    expect(tripSpy.getTripById).not.toHaveBeenCalled();
  });

  // ── load ──────────────────────────────────────────────────────────────────

  it('load: should populate data on success', () => {
    const { component } = setup();
    expect(component.data).toEqual(MOCK_DATA);
  });

  it('load: should set loading to false after success', () => {
    const { component } = setup();
    expect(component.loading).toBe(false);
  });

  it('load: should close create and add-item forms after success', () => {
    const { component } = setup();
    component.showCreateForm  = true;
    component.showAddItemForm = true;
    component.load();
    expect(component.showCreateForm).toBe(false);
    expect(component.showAddItemForm).toBe(false);
  });

  it('load: should set data to null on error', () => {
    const { component } = setup({
      get: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
    });
    expect(component.data).toBeNull();
  });

  it('load: should set loading to false on error', () => {
    const { component } = setup({
      get: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
    });
    expect(component.loading).toBe(false);
  });

  it('load: should show snack on non-404 error', () => {
    const { snackSpy } = setup({
      get: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
    });
    expect(snackSpy).toHaveBeenCalledWith('Failed to load packing list.', 'Close', { duration: 3000 });
  });

  it('load: should NOT show snack on 404 error', () => {
    const { snackSpy } = setup({
      get: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
    });
    expect(snackSpy).not.toHaveBeenCalledWith('Failed to load packing list.', 'Close', { duration: 3000 });
  });

  // ── submitCreate ──────────────────────────────────────────────────────────

  it('submitCreate: should show snack when no climate selected', () => {
    const { component, snackSpy } = setup();
    component.createClimate = '';
    component.submitCreate();
    expect(snackSpy).toHaveBeenCalledWith('Please select a climate.', 'Close', { duration: 2500 });
  });

  it('submitCreate: should NOT call service when climate is empty', () => {
    const { component, packingSpy } = setup();
    component.createClimate = '';
    component.submitCreate();
    expect(packingSpy.create).not.toHaveBeenCalled();
  });

  it('submitCreate: should call create with correct payload', () => {
    const { component, packingSpy } = setup();
    component.createClimate      = 'cold';
    component.createDuration     = 9;
    component.createAutoPopulate = true;
    component.submitCreate();
    expect(packingSpy.create).toHaveBeenCalledWith({
      trip_id:       2,
      destination:   'Europe',
      climate:       'cold',
      duration_days: 9,
      auto_populate: true,
    });
  });

  it('submitCreate: should show success snack and reload on success', () => {
    const { component, packingSpy, snackSpy } = setup();
    component.createClimate = 'tropical';
    component.submitCreate();
    expect(snackSpy).toHaveBeenCalledWith('Packing list created!', 'OK', { duration: 2000 });
    expect(packingSpy.get).toHaveBeenCalledTimes(2); // init + after create
  });

  it('submitCreate: should reset saving to false on success', () => {
    const { component } = setup();
    component.createClimate = 'cold';
    component.submitCreate();
    expect(component.saving).toBe(false);
  });

  it('submitCreate: should reload without error snack on 409 conflict', () => {
    const { component, packingSpy, snackSpy } = setup({
      create: vi.fn().mockReturnValue(throwError(() => ({ status: 409 }))),
    });
    component.createClimate = 'rainy';
    component.submitCreate();
    expect(snackSpy).not.toHaveBeenCalledWith('Failed to create packing list.', 'Close', { duration: 3000 });
    expect(packingSpy.get).toHaveBeenCalledTimes(2); // init + after 409
  });

  it('submitCreate: should show error snack on non-409 failure', () => {
    const { component, snackSpy } = setup({
      create: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
    });
    component.createClimate = 'cold';
    component.submitCreate();
    expect(snackSpy).toHaveBeenCalledWith('Failed to create packing list.', 'Close', { duration: 3000 });
  });

  // ── submitAddItem ─────────────────────────────────────────────────────────

  it('submitAddItem: should show snack when item name is empty', () => {
    const { component, snackSpy } = setup();
    component.newName = '   ';
    component.submitAddItem();
    expect(snackSpy).toHaveBeenCalledWith('Item name is required.', 'Close', { duration: 2500 });
  });

  it('submitAddItem: should NOT call service when name is blank', () => {
    const { component, packingSpy } = setup();
    component.newName = '';
    component.submitAddItem();
    expect(packingSpy.addItem).not.toHaveBeenCalled();
  });

  it('submitAddItem: should call addItem with trimmed name and correct payload', () => {
    const { component, packingSpy } = setup();
    component.newName     = '  Passport  ';
    component.newCategory = 'Documents';
    component.newQty      = 2;
    component.newNotes    = 'Keep safe';
    component.submitAddItem();
    expect(packingSpy.addItem).toHaveBeenCalledWith(2, {
      item_name: 'Passport',
      category:  'Documents',
      quantity:  2,
      notes:     'Keep safe',
    });
  });

  it('submitAddItem: should reset form fields and close form on success', () => {
    const { component } = setup();
    component.newName     = 'Sunscreen';
    component.newCategory = 'Health';
    component.newQty      = 3;
    component.newNotes    = 'SPF 50';
    component.showAddItemForm = true;
    component.submitAddItem();
    expect(component.newName).toBe('');
    expect(component.newCategory).toBe('Other');
    expect(component.newQty).toBe(1);
    expect(component.newNotes).toBe('');
    expect(component.showAddItemForm).toBe(false);
  });

  it('submitAddItem: should show success snack and reload on success', () => {
    const { component, packingSpy, snackSpy } = setup();
    component.newName = 'Sunscreen';
    component.submitAddItem();
    expect(snackSpy).toHaveBeenCalledWith('Item added!', 'OK', { duration: 2000 });
    expect(packingSpy.get).toHaveBeenCalledTimes(2); // init + after add
  });

  it('submitAddItem: should show error snack on failure', () => {
    const { component, snackSpy } = setup({
      addItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    component.newName = 'Raincoat';
    component.submitAddItem();
    expect(snackSpy).toHaveBeenCalledWith('Failed to add item.', 'Close', { duration: 3000 });
  });

  it('submitAddItem: should reset saving to false on error', () => {
    const { component } = setup({
      addItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    component.newName = 'Raincoat';
    component.submitAddItem();
    expect(component.saving).toBe(false);
  });

  // ── toggleCheck ───────────────────────────────────────────────────────────

  it('toggleCheck: should optimistically toggle is_checked to true', () => {
    const { component } = setup();
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, items: [item] };
    component.toggleCheck(item);
    expect(item.is_checked).toBe(true);
  });

  it('toggleCheck: should optimistically toggle is_checked to false', () => {
    const { component } = setup();
    const item = { ...ITEM_ACCESSORIES }; // already checked
    component.data = { ...MOCK_DATA, items: [item] };
    component.toggleCheck(item);
    expect(item.is_checked).toBe(false);
  });

  it('toggleCheck: should update checked_items count optimistically', () => {
    const { component } = setup();
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, checked_items: 1, total_items: 2, items: [item] };
    component.toggleCheck(item);
    expect(component.data!.checked_items).toBe(2);
  });

  it('toggleCheck: should recalculate percent_complete optimistically', () => {
    const { component } = setup();
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, checked_items: 1, total_items: 2, percent_complete: 50, items: [item] };
    component.toggleCheck(item);
    expect(component.data!.percent_complete).toBe(100);
  });

  it('toggleCheck: should call updateItem with new is_checked value', () => {
    const { component, packingSpy } = setup();
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, items: [item] };
    component.toggleCheck(item);
    expect(packingSpy.updateItem).toHaveBeenCalledWith(1, { is_checked: true });
  });

  it('toggleCheck: should revert is_checked on API error', () => {
    const { component } = setup({
      updateItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    const item = { ...ITEM_CLOTHING }; // was false
    component.data = { ...MOCK_DATA, items: [item] };
    component.toggleCheck(item);
    expect(item.is_checked).toBe(false);
  });

  it('toggleCheck: should revert checked_items count on API error', () => {
    const { component } = setup({
      updateItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, checked_items: 1, total_items: 2, items: [item] };
    component.toggleCheck(item);
    expect(component.data!.checked_items).toBe(1);
  });

  it('toggleCheck: should show snack on API error', () => {
    const { component, snackSpy } = setup({
      updateItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    const item = { ...ITEM_CLOTHING };
    component.data = { ...MOCK_DATA, items: [item] };
    component.toggleCheck(item);
    expect(snackSpy).toHaveBeenCalledWith('Failed to update.', 'Close', { duration: 2000 });
  });

  // ── deleteItem ────────────────────────────────────────────────────────────

  it('deleteItem: should call deleteItem service when confirmed', () => {
    const { component, packingSpy } = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(ITEM_CLOTHING);
    expect(packingSpy.deleteItem).toHaveBeenCalledWith(1);
  });

  it('deleteItem: should NOT call service when user cancels confirm', () => {
    const { component, packingSpy } = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteItem(ITEM_CLOTHING);
    expect(packingSpy.deleteItem).not.toHaveBeenCalled();
  });

  it('deleteItem: should reset deletingItemId to null after success', () => {
    const { component } = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(ITEM_CLOTHING);
    expect(component.deletingItemId).toBeNull();
  });

  it('deleteItem: should show success snack and reload on success', () => {
    const { component, packingSpy, snackSpy } = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(ITEM_CLOTHING);
    expect(snackSpy).toHaveBeenCalledWith('Item removed.', 'OK', { duration: 2000 });
    expect(packingSpy.get).toHaveBeenCalledTimes(2); // init + after delete
  });

  it('deleteItem: should show error snack on failure', () => {
    const { component, snackSpy } = setup({
      deleteItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(ITEM_CLOTHING);
    expect(snackSpy).toHaveBeenCalledWith('Failed to delete item.', 'Close', { duration: 3000 });
  });

  it('deleteItem: should reset deletingItemId to null on error', () => {
    const { component } = setup({
      deleteItem: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteItem(ITEM_CLOTHING);
    expect(component.deletingItemId).toBeNull();
  });

  // ── deleteList ────────────────────────────────────────────────────────────

  it('deleteList: should call deleteList service with tripId', () => {
    const { component, packingSpy } = setup();
    component.deleteList();
    expect(packingSpy.deleteList).toHaveBeenCalledWith(2);
  });

  it('deleteList: should set data to null on success', () => {
    const { component } = setup();
    component.deleteList();
    expect(component.data).toBeNull();
  });

  it('deleteList: should show success snack on success', () => {
    const { component, snackSpy } = setup();
    component.deleteList();
    expect(snackSpy).toHaveBeenCalledWith('Packing list deleted.', 'OK', { duration: 2000 });
  });

  it('deleteList: should show error snack on failure', () => {
    const { component, snackSpy } = setup({
      deleteList: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    });
    component.deleteList();
    expect(snackSpy).toHaveBeenCalledWith('Failed to delete.', 'Close', { duration: 3000 });
  });

  // ── groupedItems (getter) ─────────────────────────────────────────────────

  it('groupedItems: should return empty array when data is null', () => {
    const { component } = setup();
    component.data = null;
    expect(component.groupedItems).toEqual([]);
  });

  it('groupedItems: should group items by category', () => {
    const { component } = setup();
    component.data = MOCK_DATA;
    const cats = component.groupedItems.map(g => g.category);
    expect(cats).toContain('Clothing');
    expect(cats).toContain('Accessories');
  });

  it('groupedItems: should return all groups when activeCategory is "All"', () => {
    const { component } = setup();
    component.data = MOCK_DATA;
    component.activeCategory = 'All';
    expect(component.groupedItems.length).toBe(2);
  });

  it('groupedItems: should filter to one category when activeCategory is set', () => {
    const { component } = setup();
    component.data = MOCK_DATA;
    component.activeCategory = 'Clothing';
    const groups = component.groupedItems;
    expect(groups.length).toBe(1);
    expect(groups[0].category).toBe('Clothing');
  });

  it('groupedItems: should fall back to "Other" for items with no category', () => {
    const { component } = setup();
    const noCatItem: PackingItem = { ...ITEM_CLOTHING, id: 9, category: undefined as any };
    component.data = { ...MOCK_DATA, items: [noCatItem] };
    component.activeCategory = 'All';
    expect(component.groupedItems[0].category).toBe('Other');
  });

  // ── allCategories (getter) ────────────────────────────────────────────────

  it('allCategories: should return empty array when data is null', () => {
    const { component } = setup();
    component.data = null;
    expect(component.allCategories).toEqual([]);
  });

  it('allCategories: should start with "All" followed by unique categories', () => {
    const { component } = setup();
    component.data = MOCK_DATA;
    const cats = component.allCategories;
    expect(cats[0]).toBe('All');
    expect(cats).toContain('Clothing');
    expect(cats).toContain('Accessories');
  });

  it('allCategories: should deduplicate categories', () => {
    const { component } = setup();
    const dup: PackingItem = { ...ITEM_CLOTHING, id: 5, item_name: 'Scarf' };
    component.data = { ...MOCK_DATA, items: [ITEM_CLOTHING, dup] };
    const clothingCount = component.allCategories.filter(c => c === 'Clothing').length;
    expect(clothingCount).toBe(1);
  });

  // ── checkedIn ─────────────────────────────────────────────────────────────

  it('checkedIn: should count only checked items', () => {
    const { component } = setup();
    expect(component.checkedIn([ITEM_CLOTHING, ITEM_ACCESSORIES])).toBe(1);
  });

  it('checkedIn: should return 0 when no items are checked', () => {
    const { component } = setup();
    expect(component.checkedIn([ITEM_CLOTHING])).toBe(0);
  });

  it('checkedIn: should return 0 for empty array', () => {
    const { component } = setup();
    expect(component.checkedIn([])).toBe(0);
  });

  // ── catIcon ───────────────────────────────────────────────────────────────

  it('catIcon: should return correct icon for all known categories', () => {
    const { component } = setup();
    expect(component.catIcon('Clothing')).toBe('checkroom');
    expect(component.catIcon('Footwear')).toBe('hiking');
    expect(component.catIcon('Electronics')).toBe('devices');
    expect(component.catIcon('Documents')).toBe('description');
    expect(component.catIcon('Personal Care')).toBe('spa');
    expect(component.catIcon('Health')).toBe('health_and_safety');
    expect(component.catIcon('Accessories')).toBe('watch');
    expect(component.catIcon('Food & Snacks')).toBe('fastfood');
    expect(component.catIcon('Other')).toBe('category');
  });

  it('catIcon: should return "category" fallback for unknown category', () => {
    const { component } = setup();
    expect(component.catIcon('Unknown')).toBe('category');
  });

  // ── progressColor (getter) ────────────────────────────────────────────────

  it('progressColor: should return "warn" when percent < 40', () => {
    const { component } = setup();
    component.data = { ...MOCK_DATA, percent_complete: 20 };
    expect(component.progressColor).toBe('warn');
  });

  it('progressColor: should return "accent" when percent is 40–79', () => {
    const { component } = setup();
    component.data = { ...MOCK_DATA, percent_complete: 50 };
    expect(component.progressColor).toBe('accent');
  });

  it('progressColor: should return "primary" when percent is >= 80', () => {
    const { component } = setup();
    component.data = { ...MOCK_DATA, percent_complete: 100 };
    expect(component.progressColor).toBe('primary');
  });

  it('progressColor: should return "warn" when data is null', () => {
    const { component } = setup();
    component.data = null;
    expect(component.progressColor).toBe('warn');
  });

});