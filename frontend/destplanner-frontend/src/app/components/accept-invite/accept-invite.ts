import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { InviteService } from '../../services/invite.service';

type PageState = 'loading' | 'success' | 'expired' | 'already_accepted' | 'already_collaborator' | 'error' | 'not_found';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './accept-invite.html',
  styleUrls: ['./accept-invite.css'],
})
export class AcceptInviteComponent implements OnInit {
  state: PageState = 'loading';
  tripId: number | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inviteService: InviteService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = 'No invite token found in the URL.';
      return;
    }
    this.acceptInvite(token);
  }

  private acceptInvite(token: string): void {
    this.state = 'loading';
    this.inviteService.acceptInvite(token).subscribe({
      next: (res) => {
        this.state = 'success';
        this.tripId = res.trip_id;
      },
      error: (err) => {
        const errorCode = err?.error?.error;
        if (errorCode === 'invite_expired') {
          this.state = 'expired';
        } else if (errorCode === 'already_accepted') {
          this.state = 'already_accepted';
        } else if (errorCode === 'already_collaborator') {
          this.state = 'already_collaborator';
        } else if (err?.status === 404) {
          this.state = 'not_found';
        } else if (err?.status === 401) {
          // Not logged in — redirect to login, return here after
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url },
          });
        } else {
          this.state = 'error';
          this.errorMessage = err?.error?.message ?? 'Something went wrong. Please try again.';
        }
      },
    });
  }

  goToTrip(): void {
    if (this.tripId) {
      this.router.navigate(['/my-trips']);
    }
  }

  goToMyTrips(): void {
    this.router.navigate(['/my-trips']);
  }
}