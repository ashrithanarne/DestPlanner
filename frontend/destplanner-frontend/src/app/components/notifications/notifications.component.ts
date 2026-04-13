import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import {
  NotificationService,
  Notification,
  NotificationPreferences,
} from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  loading = false;
  showPreferences = false;
  showUnreadOnly = false;
  deletingId: number | null = null;

  prefsForm!: FormGroup;

  private subs: Subscription[] = [];

  constructor(
    public notifService: NotificationService,
    private snack: MatSnackBar,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.prefsForm = this.fb.group({
      email_enabled: [false],
      trip_reminders: [true],
      itinerary_changes: [true],
      expense_updates: [true],
      collaborator_updates: [true],
    });

    this.subs.push(
      this.notifService.notifications$.subscribe(ns => (this.notifications = ns)),
      this.notifService.unreadCount$.subscribe(c => (this.unreadCount = c))
    );

    this.loadNotifications();
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadNotifications(): void {
    this.loading = true;
    this.notifService.getNotifications(this.showUnreadOnly).subscribe({
      next: () => (this.loading = false),
      error: (err: any) => {
        this.loading = false;
        if (err.status !== 401) {
          this.snack.open('Failed to load notifications', 'Close', { duration: 3000 });
        }
      },
    });
  }

  loadPreferences(): void {
    this.notifService.getPreferences().subscribe({
      next: (prefs: NotificationPreferences) => this.prefsForm.patchValue(prefs),
      error: () => {},
    });
  }

  toggleUnreadFilter(): void {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.loadNotifications();
  }

  markRead(notif: Notification): void {
    if (notif.is_read) return;
    this.notifService.markRead(notif.id).subscribe({
      error: () =>
        this.snack.open('Failed to mark as read', 'Close', { duration: 2000 }),
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe({
      next: () =>
        this.snack.open('All notifications marked as read', 'Close', { duration: 2000 }),
      error: () =>
        this.snack.open('Failed to mark all as read', 'Close', { duration: 2000 }),
    });
  }

  deleteNotification(id: number): void {
    this.deletingId = id;
    this.notifService.deleteNotification(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.snack.open('Notification deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.deletingId = null;
        this.snack.open('Failed to delete notification', 'Close', { duration: 2000 });
      },
    });
  }

  savePreferences(): void {
    if (this.prefsForm.invalid) return;
    this.notifService.updatePreferences(this.prefsForm.value).subscribe({
      next: () => {
        this.showPreferences = false;
        this.snack.open('Preferences saved', 'Close', { duration: 2000 });
      },
      error: () =>
        this.snack.open('Failed to save preferences', 'Close', { duration: 2000 }),
    });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      trip_reminder_7day: 'schedule',
      trip_reminder_1day: 'alarm',
      trip_updated: 'edit',
      itinerary_changed: 'event_note',
      collaborator_added: 'person_add',
      expense_added: 'receipt',
      expense_settled: 'check_circle',
    };
    return map[type] ?? 'notifications';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      trip_reminder_7day: 'accent',
      trip_reminder_1day: 'warn',
      trip_updated: 'primary',
      itinerary_changed: 'primary',
      collaborator_added: 'accent',
      expense_added: 'warn',
      expense_settled: 'primary',
    };
    return map[type] ?? 'primary';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackById(_: number, item: Notification): number {
    return item.id;
  }
}