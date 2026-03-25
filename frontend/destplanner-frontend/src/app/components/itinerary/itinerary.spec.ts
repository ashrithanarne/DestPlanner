import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ItineraryComponent } from './itinerary';
import { ItineraryService, Itinerary, ItineraryItem } from '../../services/itinerary';

const MOCK_ITEMS: ItineraryItem[] = [
  { id: 1, time: '09:00', activity: 'Visit Eiffel Tower', location: 'Paris', notes: '' },
  { id: 2, time: '12:00', activity: 'Lunch', location: 'Downtown', notes: '' },
];

const MOCK_ITINERARY: Itinerary = { id: 1, name: 'Paris Trip', items: MOCK_ITEMS };

describe('ItineraryComponent', () => {
  let component: ItineraryComponent;
  let fixture: ComponentFixture<ItineraryComponent>;

  const mockService = {
    getItinerary: vi.fn(() => of(MOCK_ITINERARY)),
    createItinerary: vi.fn(() => of(MOCK_ITINERARY)),
    updateItinerary: vi.fn(() => of(MOCK_ITINERARY)),
    deleteItineraryItem: vi.fn(() => of({ message: 'Deleted' })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    mockService.getItinerary.mockReturnValue(of(MOCK_ITINERARY));
    mockService.updateItinerary.mockReturnValue(of(MOCK_ITINERARY));
    mockService.deleteItineraryItem.mockReturnValue(of({ message: 'Deleted' }));

    await TestBed.configureTestingModule({
      imports: [ItineraryComponent],
      providers: [
        { provide: ItineraryService, useValue: mockService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        provideRouter([]),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItineraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loadItinerary: should use fallback items on error', async () => {
    mockService.getItinerary.mockReturnValue(throwError(() => ({ status: 404 })));
    component.loadItinerary();
    await fixture.whenStable();
    expect(component.itineraryItems.length).toBeGreaterThan(0);
    expect(component.loading).toBe(false);
  });

  // ── openForm ──────────────────────────────────────────────────────────────
  it('openForm: should set showForm to true', () => {
    component.openForm();
    expect(component.showForm).toBe(true);
  });

  it('openForm: should reset editingId when no item passed', () => {
    component.openForm();
    expect(component.editingId).toBeNull();
  });

  it('openForm: should set editingId when item passed', () => {
    component.openForm(MOCK_ITEMS[0]);
    expect(component.editingId).toBe(1);
    expect(component.itemForm.get('activity')?.value).toBe('Visit Eiffel Tower');
  });

  // ── closeForm ─────────────────────────────────────────────────────────────
  it('closeForm: should set showForm to false', () => {
    component.showForm = true;
    component.closeForm();
    expect(component.showForm).toBe(false);
  });

  it('closeForm: should reset editingId', () => {
    component.editingId = 1;
    component.closeForm();
    expect(component.editingId).toBeNull();
  });

  // ── itemForm ──────────────────────────────────────────────────────────────
  it('itemForm: should be invalid when empty', () => {
    component.itemForm.reset();
    expect(component.itemForm.invalid).toBe(true);
  });

  it('itemForm: should be valid when time and activity filled', () => {
    component.itemForm.patchValue({ time: '10:00', activity: 'Museum' });
    expect(component.itemForm.valid).toBe(true);
  });

  // ── saveItem — add new ────────────────────────────────────────────────────
  it('saveItem: should add new item to itineraryItems', async () => {
    const initialCount = component.itineraryItems.length;
    component.openForm();
    component.itemForm.patchValue({ time: '15:00', activity: 'Shopping' });
    component.saveItem();
    await fixture.whenStable();
    expect(component.itineraryItems.length).toBe(initialCount + 1);
  });

  it('saveItem: should not save if form is invalid', () => {
    component.itemForm.reset();
    component.saveItem();
    expect(mockService.updateItinerary).not.toHaveBeenCalled();
  });

  // ── saveItem — edit existing ──────────────────────────────────────────────
  it('saveItem: should update existing item when editingId is set', async () => {
    component.itineraryItems = [...MOCK_ITEMS];
    component.openForm(MOCK_ITEMS[0]);
    component.itemForm.patchValue({ time: '10:00', activity: 'Updated Activity' });
    component.saveItem();
    await fixture.whenStable();
    const updated = component.itineraryItems.find(i => i.id === 1);
    expect(updated?.activity).toBe('Updated Activity');
  });

  // ── saveItem — calls updateItinerary ─────────────────────────────────────
  it('saveItem: should call updateItinerary on save', async () => {
    component.openForm();
    component.itemForm.patchValue({ time: '16:00', activity: 'Dinner' });
    component.saveItem();
    await fixture.whenStable();
    expect(mockService.updateItinerary).toHaveBeenCalled();
  });

  // ── deleteItem ────────────────────────────────────────────────────────────
  it('deleteItem: should remove item from itineraryItems', async () => {
    component.itineraryItems = [...MOCK_ITEMS];
    const event = new MouseEvent('click');
    component.deleteItem(1, event);
    await fixture.whenStable();
    expect(component.itineraryItems.find(i => i.id === 1)).toBeUndefined();
  });

  it('deleteItem: should call deleteItineraryItem on service', async () => {
    component.itineraryItems = [...MOCK_ITEMS];
    const event = new MouseEvent('click');
    component.deleteItem(1, event);
    await fixture.whenStable();
    expect(mockService.deleteItineraryItem).toHaveBeenCalledWith(1, 1);
  });
});
