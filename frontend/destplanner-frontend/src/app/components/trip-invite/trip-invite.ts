import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  InviteService,
  TripInvite,
  InviteResult,
} from '../../services/invite.service';

@Component({
  selector: 'app-trip-invite',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './trip-invite.html',
  styleUrls: ['./trip-invite.css'],
})
export class TripInviteComponent implements OnInit, OnChanges {
  @Input() tripId!: number;

  inviteForm!: FormGroup;

  /** Emails staged to send (chip list) */
  stagedEmails: string[] = [];

  invites: TripInvite[] = [];
  lastResults: InviteResult[] = [];

  loading = false;
  sending = false;

  constructor(
    private fb: FormBuilder,
    private inviteService: InviteService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inviteForm = this.fb.group({
      emailInput: ['', [Validators.email]],
    });
    this.loadInvites();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tripId'] && !changes['tripId'].firstChange) {
      this.loadInvites();
    }
  }

  loadInvites(): void {
    if (!this.tripId) return;
    this.loading = true;
    this.inviteService.getInvites(this.tripId).subscribe({
      next: (res) => {
        this.invites = res.invites ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Add an email to the staged list on Enter / comma / blur */
  addEmailFromInput(event?: Event): void {
    const raw = this.inviteForm.get('emailInput')?.value?.trim() ?? '';
    if (!raw) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(raw)) {
      this.inviteForm.get('emailInput')?.setErrors({ email: true });
      return;
    }
    if (!this.stagedEmails.includes(raw)) {
      this.stagedEmails.push(raw);
    }
    this.inviteForm.get('emailInput')?.reset('');
    event?.preventDefault();
  }

  removeEmail(email: string): void {
    this.stagedEmails = this.stagedEmails.filter((e) => e !== email);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      this.addEmailFromInput(event);
    }
  }

  sendInvites(): void {
    // Try to add whatever is in the input box first
    this.addEmailFromInput();

    if (this.stagedEmails.length === 0) {
      this.snack.open('Please add at least one email address.', 'Close', { duration: 3000 });
      return;
    }

    this.sending = true;
    this.lastResults = [];

    this.inviteService.sendInvites(this.tripId, [...this.stagedEmails]).subscribe({
      next: (res) => {
        this.sending = false;
        this.lastResults = res.results ?? [];
        this.stagedEmails = [];
        this.inviteForm.reset();
        this.cdr.detectChanges();
        this.loadInvites();

        const invited = this.lastResults.filter((r) => r.status === 'invited').length;
        if (invited > 0) {
          this.snack.open(
            `${invited} invite${invited > 1 ? 's' : ''} sent!`,
            'Close',
            { duration: 3000 }
          );
        }
      },
      error: () => {
        this.sending = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to send invites. Please try again.', 'Close', { duration: 4000 });
      },
    });
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      pending: 'schedule',
      accepted: 'check_circle',
      expired: 'timer_off',
    };
    return map[status] ?? 'help_outline';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      accepted: 'Accepted',
      expired: 'Expired',
    };
    return map[status] ?? status;
  }

  getResultLabel(status: string): string {
    const map: Record<string, string> = {
      invited: 'Invite sent',
      already_invited: 'Already invited (pending)',
      already_collaborator: 'Already a collaborator',
      invalid_email: 'Invalid email address',
      error: 'Failed to invite',
    };
    return map[status] ?? status;
  }

  getResultIcon(status: string): string {
    const map: Record<string, string> = {
      invited: 'check_circle',
      already_invited: 'info',
      already_collaborator: 'person_check',
      invalid_email: 'error',
      error: 'error',
    };
    return map[status] ?? 'help';
  }

  isResultSuccess(status: string): boolean {
    return status === 'invited';
  }

  isResultWarning(status: string): boolean {
    return status === 'already_invited' || status === 'already_collaborator';
  }

  isResultError(status: string): boolean {
    return status === 'invalid_email' || status === 'error';
  }

  formatExpiry(expiresAt: string): string {
    const d = new Date(expiresAt);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}