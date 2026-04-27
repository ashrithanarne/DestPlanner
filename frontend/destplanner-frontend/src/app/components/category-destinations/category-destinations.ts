import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DestinationService, Destination } from '../../services/destination';

export interface TripCategory {
  key: string;
  label: string;
  icon: string;
  gradient: string;
  description: string;
}

export const TRIP_CATEGORIES: TripCategory[] = [
  {
    key: 'friends',
    label: 'Trip with Friends',
    icon: 'group',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    description: 'Vibrant cities and adventure hotspots',
  },
  {
    key: 'family',
    label: 'Trip with Family',
    icon: 'family_restroom',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    description: 'Safe, fun destinations for all ages',
  },
  {
    key: 'couples',
    label: 'Best for Couples',
    icon: 'favorite',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    description: 'Romantic escapes and scenic getaways',
  },
  {
    key: 'solo',
    label: 'Solo Travel',
    icon: 'person',
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    description: 'Safe and exciting destinations to explore alone',
  },
  {
    key: 'adventure',
    label: 'Adventure',
    icon: 'terrain',
    gradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
    description: 'Thrilling experiences for the bold traveller',
  },
  {
    key: 'cultural',
    label: 'Cultural',
    icon: 'museum',
    gradient: 'linear-gradient(135deg, #30cfd0, #330867)',
    description: 'Rich history, art and local traditions',
  },
];

/** Category-based destination browser. */
@Component({
  selector: 'app-category-destinations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './category-destinations.html',
  styleUrls: ['./category-destinations.css'],
})
export class CategoryDestinationsComponent implements OnInit {
  readonly categories: TripCategory[] = TRIP_CATEGORIES;

  selectedCategory: TripCategory | null = null;
  destinations: Destination[] = [];
  loading = false;
  error = false;

  constructor(
    private destService: DestinationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Pre-select the first category on load
    this.selectCategory(this.categories[0]);
  }

  selectCategory(cat: TripCategory): void {
    if (this.selectedCategory?.key === cat.key) return;
    this.selectedCategory = cat;
    this.loadDestinations(cat.key);
  }

  loadDestinations(categoryKey: string): void {
    this.loading = true;
    this.error = false;
    this.destinations = [];
    this.cdr.markForCheck();

    this.destService.getDestinationsByCategory(categoryKey).subscribe({
      next: (data) => {
        this.destinations = data ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Star array for rating display (e.g. rating=4.3 → 4 filled + 1 empty) */
  getStars(rating: number = 0): { filled: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({ filled: i < Math.round(rating) }));
  }

  getCategoryGradient(key: string): string {
    return this.categories.find(c => c.key === key)?.gradient ??
      'linear-gradient(135deg, #667eea, #764ba2)';
  }

  /** Fallback placeholder gradient per destination index */
  getCardGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #11998e, #38ef7d)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #f7971e, #ffd200)',
      'linear-gradient(135deg, #30cfd0, #330867)',
    ];
    return gradients[index % gradients.length];
  }
}