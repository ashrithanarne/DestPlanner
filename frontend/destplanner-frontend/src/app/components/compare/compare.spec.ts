import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Component } from '@angular/core';
import { CompareComponent } from './compare';
import { DestinationService, DestinationCompare, CompareResponse } from '../../services/destination';

@Component({ template: '', standalone: true })
class DummyComponent {}

const MOCK_DEST_1: DestinationCompare = {
  id: 1, name: 'Paris', country: 'France', budget: 2000,
  description: 'City of Light', best_season: 'Spring',
  travel_time: '2h flight', activities: ['Eiffel Tower', 'Louvre Museum'],
};
const MOCK_DEST_2: DestinationCompare = {
  id: 2, name: 'Tokyo', country: 'Japan', budget: 3000,
  description: 'Land of the Rising Sun', best_season: 'Autumn',
  travel_time: '14h flight', activities: ['Shibuya Crossing'],
};
const MOCK_DEST_3: DestinationCompare = {
  id: 3, name: 'Bali', country: 'Indonesia', budget: 1500,
  description: 'Island of the Gods', best_season: 'Summer',
  travel_time: '18h flight', activities: [],
};

const MOCK_COMPARE_RESPONSE: CompareResponse = {
  total_destinations: 2,
  destinations: [MOCK_DEST_1, MOCK_DEST_2],
};

describe('CompareComponent', () => {
  let component: CompareComponent;
  let fixture: ComponentFixture<CompareComponent>;
  let router: Router;

  const mockDestService = {
    compareDestinations: vi.fn(() => of(MOCK_COMPARE_RESPONSE)),
  };

  async function setup(idsParam = '1,2') {
    vi.clearAllMocks();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [CompareComponent],
      providers: [
        { provide: DestinationService, useValue: mockDestService },
        provideRouter([
          { path: 'destinations', component: DummyComponent },
          { path: '**', component: DummyComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => idsParam } } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompareComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDestService.compareDestinations.mockReturnValue(of({ ...MOCK_COMPARE_RESPONSE }));
    await setup();
  });

  afterEach(() => { TestBed.resetTestingModule(); });

  // ── should create ─────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit: valid 2 IDs ─────────────────────────────────────────────────
  it('ngOnInit: should call compareDestinations with parsed ids', () => {
    expect(mockDestService.compareDestinations).toHaveBeenCalledWith([1, 2]);
  });

  it('ngOnInit: should populate destinations on success', () => {
    expect(component.destinations.length).toBe(2);
    expect(component.destinations[0].name).toBe('Paris');
    expect(component.destinations[1].name).toBe('Tokyo');
  });

  it('ngOnInit: should set loading to false on success', () => {
    expect(component.loading).toBe(false);
  });

  // ── ngOnInit: valid 3 IDs ─────────────────────────────────────────────────
  it('ngOnInit: should accept 3 destination IDs', async () => {
    mockDestService.compareDestinations.mockReturnValue(of({
      total_destinations: 3,
      destinations: [MOCK_DEST_1, MOCK_DEST_2, MOCK_DEST_3],
    }));
    await setup('1,2,3');
    expect(mockDestService.compareDestinations).toHaveBeenCalledWith([1, 2, 3]);
    expect(component.destinations.length).toBe(3);
  });

  // ── ngOnInit: invalid IDs ─────────────────────────────────────────────────
  it('ngOnInit: should set error when only 1 ID provided', async () => {
    await setup('1');
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
    expect(mockDestService.compareDestinations).not.toHaveBeenCalled();
  });

  it('ngOnInit: should set error when more than 3 IDs provided', async () => {
    await setup('1,2,3,4');
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
    expect(mockDestService.compareDestinations).not.toHaveBeenCalled();
  });

  it('ngOnInit: should set error when ids param is empty', async () => {
    await setup('');
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  // ── ngOnInit: API error ───────────────────────────────────────────────────
  it('ngOnInit: should set error on API failure', async () => {
    mockDestService.compareDestinations.mockReturnValue(throwError(() => new Error('fail')));
    await setup('1,2');
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  // ── destination fields ────────────────────────────────────────────────────
  it('should expose budget for each destination', () => {
    expect(component.destinations[0].budget).toBe(2000);
    expect(component.destinations[1].budget).toBe(3000);
  });

  it('should expose best_season for each destination', () => {
    expect(component.destinations[0].best_season).toBe('Spring');
    expect(component.destinations[1].best_season).toBe('Autumn');
  });

  it('should expose travel_time for each destination', () => {
    expect(component.destinations[0].travel_time).toBe('2h flight');
    expect(component.destinations[1].travel_time).toBe('14h flight');
  });

  it('should expose activities array for each destination', () => {
    expect(component.destinations[0].activities).toEqual(['Eiffel Tower', 'Louvre Museum']);
    expect(component.destinations[1].activities).toEqual(['Shibuya Crossing']);
  });

  // ── removeDestination ─────────────────────────────────────────────────────
  it('removeDestination: should remove the destination with given id', () => {
    component.removeDestination(1);
    expect(component.destinations.find(d => d.id === 1)).toBeUndefined();
  });

  it('removeDestination: should navigate to /destinations when fewer than 2 remain', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.removeDestination(1);
    expect(spy).toHaveBeenCalledWith(['/destinations']);
  });

  it('removeDestination: should keep other destinations when removing one from 3', async () => {
    mockDestService.compareDestinations.mockReturnValue(of({
      total_destinations: 3,
      destinations: [MOCK_DEST_1, MOCK_DEST_2, MOCK_DEST_3],
    }));
    await setup('1,2,3');
    component.removeDestination(3);
    expect(component.destinations.length).toBe(2);
    expect(component.destinations.find(d => d.id === 3)).toBeUndefined();
  });

  // ── goBack ────────────────────────────────────────────────────────────────
  it('goBack: should navigate to /destinations', () => {
    const spy = vi.spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/destinations']);
  });
});
