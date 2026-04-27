import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  CategoryDestinationsComponent,
  TRIP_CATEGORIES,
} from './category-destinations';
import { DestinationService, Destination } from '../../services/destination';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_FRIENDS: Destination[] = [
  { id: 1, name: 'Barcelona', country: 'Spain',  budget: 120, description: 'Party city', category: 'friends', rating: 4.5 },
  { id: 2, name: 'Amsterdam', country: 'Netherlands', budget: 150, description: 'Canal city', category: 'friends', rating: 4.2 },
];

const MOCK_COUPLES: Destination[] = [
  { id: 3, name: 'Venice', country: 'Italy', budget: 200, description: 'Romantic canals', category: 'couples', rating: 4.8 },
];

const mockDestService = {
  getDestinationsByCategory: vi.fn(() => of(MOCK_FRIENDS)),
};

// ── Helper ────────────────────────────────────────────────────────────────────

async function createComponent(overrides?: Partial<typeof mockDestService>) {
  vi.clearAllMocks();
  if (overrides) Object.assign(mockDestService, overrides);

  await TestBed.configureTestingModule({
    imports: [CategoryDestinationsComponent],
    providers: [
      { provide: DestinationService, useValue: mockDestService },
      provideRouter([]),
      provideNoopAnimations(),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CategoryDestinationsComponent);
  const component = fixture.componentInstance;
  return { fixture, component };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CategoryDestinationsComponent', () => {
  let component: CategoryDestinationsComponent;
  let fixture: ComponentFixture<CategoryDestinationsComponent>;

  beforeEach(async () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(of(MOCK_FRIENDS));
    ({ fixture, component } = await createComponent());
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose all 6 TRIP_CATEGORIES', () => {
    expect(component.categories.length).toBe(6);
  });

  it('should pre-select the first category on init', () => {
    expect(component.selectedCategory?.key).toBe(TRIP_CATEGORIES[0].key);
  });

  it('should call getDestinationsByCategory with first category key on init', () => {
    expect(mockDestService.getDestinationsByCategory).toHaveBeenCalledWith(
      TRIP_CATEGORIES[0].key
    );
  });

  it('should populate destinations after init', () => {
    expect(component.destinations.length).toBe(2);
    expect(component.destinations[0].name).toBe('Barcelona');
  });

  it('should set loading=false after successful load', () => {
    expect(component.loading).toBe(false);
  });

  it('should set error=false after successful load', () => {
    expect(component.error).toBe(false);
  });

  // ── Category selection ─────────────────────────────────────────────────────

  it('selectCategory: should update selectedCategory', () => {
    const couples = TRIP_CATEGORIES.find(c => c.key === 'couples')!;
    mockDestService.getDestinationsByCategory.mockReturnValue(of(MOCK_COUPLES));
    component.selectCategory(couples);
    expect(component.selectedCategory?.key).toBe('couples');
  });

  it('selectCategory: should call getDestinationsByCategory with new key', () => {
    const family = TRIP_CATEGORIES.find(c => c.key === 'family')!;
    mockDestService.getDestinationsByCategory.mockReturnValue(of([]));
    component.selectCategory(family);
    expect(mockDestService.getDestinationsByCategory).toHaveBeenCalledWith('family');
  });

  it('selectCategory: should NOT re-fetch if same category is selected', () => {
    const callsBefore = mockDestService.getDestinationsByCategory.mock.calls.length;
    component.selectCategory(TRIP_CATEGORIES[0]); // already selected
    expect(mockDestService.getDestinationsByCategory.mock.calls.length).toBe(callsBefore);
  });

  it('selectCategory: should replace destinations with new results', () => {
    const couples = TRIP_CATEGORIES.find(c => c.key === 'couples')!;
    mockDestService.getDestinationsByCategory.mockReturnValue(of(MOCK_COUPLES));
    component.selectCategory(couples);
    expect(component.destinations).toEqual(MOCK_COUPLES);
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it('should set destinations=[] when API returns empty array', () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(of([]));
    component.loadDestinations('solo');
    expect(component.destinations.length).toBe(0);
  });

  it('should render empty-state element when no destinations', async () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(of([]));
    component.loadDestinations('solo');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-cy="empty-state"]');
    expect(el).toBeTruthy();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('should set error=true on HTTP error', () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(throwError(() => new Error('net')));
    component.loadDestinations('friends');
    expect(component.error).toBe(true);
  });

  it('should set loading=false on HTTP error', () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(throwError(() => new Error('net')));
    component.loadDestinations('friends');
    expect(component.loading).toBe(false);
  });

  it('should render error-state element on failure', async () => {
    mockDestService.getDestinationsByCategory.mockReturnValue(throwError(() => new Error('net')));
    component.loadDestinations('friends');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-cy="error-state"]');
    expect(el).toBeTruthy();
  });

  // ── Destinations grid ──────────────────────────────────────────────────────

  it('should render destination cards in the grid', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('[data-cy^="dest-card-"]');
    expect(cards.length).toBe(2);
  });

  it('should render correct destination name in card', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('[data-cy="dest-card-1"]');
    expect(card?.textContent).toContain('Barcelona');
  });

  it('should render category banner for selected category', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-cy="category-banner"]');
    expect(banner).toBeTruthy();
  });

  it('should render all category tabs', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[data-cy^="cat-tab-"]');
    expect(tabs.length).toBe(6);
  });

  // ── Helper methods ─────────────────────────────────────────────────────────

  it('getStars: should return 5 elements', () => {
    expect(component.getStars(4).length).toBe(5);
  });

  it('getStars: should fill correct number of stars for rating 4', () => {
    const stars = component.getStars(4);
    const filled = stars.filter(s => s.filled).length;
    expect(filled).toBe(4);
  });

  it('getStars: should round rating for star fill (4.6 → 5 filled)', () => {
    const filled = component.getStars(4.6).filter(s => s.filled).length;
    expect(filled).toBe(5);
  });

  it('getStars: should return 0 filled for rating 0', () => {
    const filled = component.getStars(0).filter(s => s.filled).length;
    expect(filled).toBe(0);
  });

  it('getStars: defaults to 0 when no rating provided', () => {
    const filled = component.getStars().filter(s => s.filled).length;
    expect(filled).toBe(0);
  });

  it('getCategoryGradient: should return gradient for known key', () => {
    const gradient = component.getCategoryGradient('friends');
    expect(gradient).toContain('gradient');
  });

  it('getCategoryGradient: should return fallback for unknown key', () => {
    const gradient = component.getCategoryGradient('unknown');
    expect(gradient).toContain('gradient');
  });

  it('getCardGradient: should cycle through gradient array', () => {
    expect(component.getCardGradient(0)).toContain('gradient');
    expect(component.getCardGradient(100)).toContain('gradient');
  });

  it('getCardGradient: should return different gradients for different indices', () => {
    const g0 = component.getCardGradient(0);
    const g1 = component.getCardGradient(1);
    expect(g0).not.toBe(g1);
  });
});