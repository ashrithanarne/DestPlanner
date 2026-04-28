import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DestinationService, DestinationCompare } from '../../services/destination';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export class CompareComponent implements OnInit {
  destinations: DestinationCompare[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destService: DestinationService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idsParam = this.route.snapshot.queryParamMap.get('ids') || '';
    const ids = idsParam
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    if (ids.length < 2 || ids.length > 3) {
      this.error = 'Please select 2 or 3 destinations to compare.';
      this.loading = false;
      return;
    }

    this.destService.compareDestinations(ids).subscribe({
      next: (res) => {
        this.destinations = res.destinations;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load comparison data.';
        this.loading = false;
        this.cdr.detectChanges();
        this.snack.open(this.error, 'Close', { duration: 3000 });
      },
    });
  }

  removeDestination(id: number): void {
    this.destinations = this.destinations.filter(d => d.id !== id);
    if (this.destinations.length < 2) {
      this.snack.open('Need at least 2 destinations to compare', 'OK', { duration: 2000 });
      this.router.navigate(['/destinations']);
    }
  }

  goBack(): void {
    this.router.navigate(['/destinations']);
  }
}
