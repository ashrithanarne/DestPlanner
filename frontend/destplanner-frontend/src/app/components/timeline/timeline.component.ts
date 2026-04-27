import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import {
  TimelineService,
  TimelineItem,
  TimelineDay,
  TimelineResponse,
  ActivityType,
} from '../../services/timeline.service';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    DragDropModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent implements OnInit, OnDestroy {
  tripId!: number;
  timeline: TimelineResponse | null = null;
  loading = false;
  showAddForm = false;
  editingItem: TimelineItem | null = null;
  viewMode: 'timeline' | 'list' = 'timeline';
  saving = false;
  deletingItemId: number | null = null;

  itemForm!: FormGroup;

  readonly activityTypes: ActivityType[] = [
    'travel',
    'accommodation',
    'activity',
    'dining',
    'other',
  ];

  private subs: Subscription[] = [];

  constructor(
    public timelineService: TimelineService,
    public route: ActivatedRoute,
    public router: Router,
    private snack: MatSnackBar,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.itemForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      activity_type: ['activity', Validators.required],
      date: ['', Validators.required],
      start_time: [''],
      end_time: [''],
      location: [''],
    });

    this.subs.push(
      this.route.params.subscribe(params => {
        this.tripId = +params['tripId'];
        if (!this.tripId) {
          this.router.navigate(['/my-trips']);
          return;
        }
        this.loadTimeline();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadTimeline(): void {
    this.loading = true;
    this.timelineService.getTimeline(this.tripId).subscribe({
      next: (data) => {
        this.timeline = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        if (err.status === 404) {
          this.timeline = { trip_id: this.tripId, days: [] } as any;
        } else {
          this.snack.open('Failed to load timeline', 'Close', { duration: 3000 });
        }
        this.cdr.detectChanges();
      },
    });
  }

  openAddForm(day?: TimelineDay): void {
    this.editingItem = null;
    this.itemForm.reset({ activity_type: 'activity' });
    if (day) {
      this.itemForm.patchValue({ date: day.date });
    }
    this.showAddForm = true;
  }

  openEditForm(item: TimelineItem): void {
    this.editingItem = item;
    this.itemForm.patchValue({
      title: item.title,
      description: item.description ?? '',
      activity_type: item.activity_type,
      date: item.date,
      start_time: item.start_time ?? '',
      end_time: item.end_time ?? '',
      location: item.location ?? '',
    });
    this.showAddForm = true;
  }

  closeForm(): void {
    this.showAddForm = false;
    this.editingItem = null;
    this.itemForm.reset({ activity_type: 'activity' });
  }

  saveItem(): void {
    if (this.itemForm.invalid) return;
    this.saving = true;
    const value = this.itemForm.value;

    if (this.editingItem) {
      this.timelineService
        .updateItem(this.tripId, this.editingItem.id, value)
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeForm();
            this.loadTimeline();
            this.snack.open('Item updated', 'Close', { duration: 2000 });
          },
          error: () => {
            this.saving = false;
            this.snack.open('Failed to update item', 'Close', { duration: 3000 });
          },
        });
    } else {
      this.timelineService.createItem(this.tripId, value).subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadTimeline();
          this.snack.open('Item added', 'Close', { duration: 2000 });
        },
        error: () => {
          this.saving = false;
          this.snack.open('Failed to add item', 'Close', { duration: 3000 });
        },
      });
    }
  }

  deleteItem(item: TimelineItem): void {
    if (!confirm(`Delete "${item.title}"?`)) return;
    this.deletingItemId = item.id;
    this.timelineService.deleteItem(this.tripId, item.id).subscribe({
      next: () => {
        this.deletingItemId = null;
        this.loadTimeline();
        this.snack.open('Item deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.deletingItemId = null;
        this.snack.open('Failed to delete item', 'Close', { duration: 3000 });
      },
    });
  }

  dropItem(event: CdkDragDrop<TimelineItem[]>, day: TimelineDay): void {
    if (event.previousIndex === event.currentIndex) return;
    const item = day.items[event.previousIndex];
    this.timelineService
      .reorderItem(this.tripId, item.id, {
        date: day.date,
        new_position: event.currentIndex + 1,
      })
      .subscribe({
        next: () => this.loadTimeline(),
        error: () =>
          this.snack.open('Failed to reorder item', 'Close', { duration: 3000 }),
      });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'timeline' ? 'list' : 'timeline';
  }

  getColor(type: ActivityType): string {
    return this.timelineService.getActivityColor(type);
  }

  getIcon(type: ActivityType): string {
    return this.timelineService.getActivityIcon(type);
  }

  getTypeLabel(type: ActivityType): string {
    const map: Record<ActivityType, string> = {
      travel: 'Travel',
      accommodation: 'Hotel',
      activity: 'Activity',
      dining: 'Dining',
      other: 'Other',
    };
    return map[type] ?? type;
  }

  trackByDay(_: number, day: TimelineDay): string {
    return day.date;
  }

  trackByItem(_: number, item: TimelineItem): number {
    return item.id;
  }
}