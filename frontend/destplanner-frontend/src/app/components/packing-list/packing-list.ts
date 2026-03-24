import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PackingListService, PackingListData, PackingItem } from '../../services/packing-list';
import { TripService, Trip } from '../../services/trip.service';

@Component({
  selector: 'app-packing-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './packing-list.html',
  styleUrls: ['./packing-list.css'],
})
export class PackingListComponent implements OnInit {
  tripId = 0;
  trip: Trip | null = null;
  data: PackingListData | null = null;

  loading = false;
  saving = false;
  deletingItemId: number | null = null;

  showCreateForm = false;
  showAddItemForm = false;
  activeCategory = 'All';

  // create form
  createClimate = '';
  createDuration = 7;
  createAutoPopulate = true;

  // add item form
  newName = '';
  newCategory = 'Other';
  newQty = 1;
  newNotes = '';

  readonly categories = [
    'Clothing', 'Footwear', 'Electronics', 'Documents',
    'Personal Care', 'Health', 'Accessories', 'Food & Snacks', 'Other'
  ];

  readonly climates = [
    { value: 'tropical', label: 'Tropical / Hot' },
    { value: 'cold', label: 'Cold / Winter' },
    { value: 'rainy', label: 'Rainy / Monsoon' },
    { value: 'temperate', label: 'Temperate / Mild' },
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private packingService: PackingListService,
    private tripService: TripService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo(0, 0);
    this.tripId = Number(this.route.snapshot.paramMap.get('tripId'));
    if (!this.tripId) { this.router.navigate(['/my-trips']); return; }
    this.tripService.getTripById(this.tripId).subscribe({
      next: t => {
        this.trip = t;
        if (t.duration_days && t.duration_days > 0) this.createDuration = t.duration_days;
        this.cdr.detectChanges();
      }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.packingService.get(this.tripId).subscribe({
      next: d => {
        this.data = d;
        this.loading = false;
        this.showCreateForm = false;
        this.showAddItemForm = false;
        this.cdr.detectChanges();
      },
      error: e => {
        this.loading = false;
        this.data = null;
        if (e.status !== 404) this.snack.open('Failed to load packing list.', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  submitCreate(): void {
    if (!this.createClimate) {
      this.snack.open('Please select a climate.', 'Close', { duration: 2500 });
      return;
    }
    this.saving = true;
    this.packingService.create({
      trip_id: this.tripId,
      destination: this.trip?.destination || '',
      climate: this.createClimate,
      duration_days: this.createDuration,
      auto_populate: this.createAutoPopulate,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Packing list created!', 'OK', { duration: 2000 });
        this.load();
      },
      error: e => {
        this.saving = false;
        this.cdr.detectChanges();
        if (e.status === 409) { this.load(); return; }
        this.snack.open('Failed to create packing list.', 'Close', { duration: 3000 });
      }
    });
  }

  submitAddItem(): void {
    if (!this.newName.trim()) {
      this.snack.open('Item name is required.', 'Close', { duration: 2500 });
      return;
    }
    this.saving = true;
    this.packingService.addItem(this.tripId, {
      item_name: this.newName.trim(),
      category: this.newCategory,
      quantity: this.newQty,
      notes: this.newNotes || undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.newName = ''; this.newCategory = 'Other'; this.newQty = 1; this.newNotes = '';
        this.showAddItemForm = false;
        this.snack.open('Item added!', 'OK', { duration: 2000 });
        this.load();
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to add item.', 'Close', { duration: 3000 });
      }
    });
  }

  toggleCheck(item: PackingItem): void {
    const prev = item.is_checked;
    item.is_checked = !prev;
    if (this.data) {
      this.data.checked_items += item.is_checked ? 1 : -1;
      this.data.percent_complete = this.data.total_items > 0
        ? Math.round((this.data.checked_items / this.data.total_items) * 100) : 0;
    }
    this.cdr.detectChanges();
    this.packingService.updateItem(item.id, { is_checked: item.is_checked }).subscribe({
      error: () => {
        item.is_checked = prev;
        if (this.data) {
          this.data.checked_items += item.is_checked ? 1 : -1;
          this.data.percent_complete = this.data.total_items > 0
            ? Math.round((this.data.checked_items / this.data.total_items) * 100) : 0;
        }
        this.cdr.detectChanges();
        this.snack.open('Failed to update.', 'Close', { duration: 2000 });
      }
    });
  }

  deleteItem(item: PackingItem): void {
    if (!confirm('Remove "' + item.item_name + '"?')) return;
    this.deletingItemId = item.id;
    this.cdr.detectChanges();
    this.packingService.deleteItem(item.id).subscribe({
      next: () => {
        this.deletingItemId = null;
        this.snack.open('Item removed.', 'OK', { duration: 2000 });
        this.load();
      },
      error: () => {
        this.deletingItemId = null;
        this.cdr.detectChanges();
        this.snack.open('Failed to delete item.', 'Close', { duration: 3000 });
      }
    });
  }

  deleteList(): void {
    
    this.packingService.deleteList(this.tripId).subscribe({
      next: () => {
        this.data = null;
        this.snack.open('Packing list deleted.', 'OK', { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: () => this.snack.open('Failed to delete.', 'Close', { duration: 3000 })
    });
  }

  get groupedItems(): { category: string; items: PackingItem[] }[] {
    if (!this.data?.items?.length) return [];
    const map: Record<string, PackingItem[]> = {};
    for (const item of this.data.items) {
      const cat = item.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    const all = Object.entries(map).map(([category, items]) => ({ category, items }));
    return this.activeCategory === 'All' ? all : all.filter(g => g.category === this.activeCategory);
  }

  get allCategories(): string[] {
    if (!this.data?.items?.length) return [];
    const cats = [...new Set(this.data.items.map(i => i.category || 'Other'))];
    return ['All', ...cats];
  }

  checkedIn(items: PackingItem[]): number {
    return items.filter(i => i.is_checked).length;
  }

  catIcon(cat: string): string {
    const m: Record<string, string> = {
      Clothing: 'checkroom', Footwear: 'hiking', Electronics: 'devices',
      Documents: 'description', 'Personal Care': 'spa', Health: 'health_and_safety',
      Accessories: 'watch', 'Food & Snacks': 'fastfood', Other: 'category',
    };
    return m[cat] ?? 'category';
  }

  get progressColor(): string {
    const p = this.data?.percent_complete ?? 0;
    return p >= 80 ? 'primary' : p >= 40 ? 'accent' : 'warn';
  }
}