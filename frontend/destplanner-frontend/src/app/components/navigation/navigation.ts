import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})
export class NavigationComponent implements OnInit, OnDestroy {

  isAuthenticated = false;
  userName = '';
  isMobileMenuOpen = false;

  private subs = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes — works on both server and browser
    // BehaviorSubject emits immediately so nav updates right after login
    this.subs.add(
      this.authService.isLoggedIn$.subscribe((loggedIn) => {
        this.isAuthenticated = loggedIn;
      })
    );
    this.subs.add(
      this.authService.currentUser$.subscribe((user) => {
        this.userName = user ? `${user.first_name} ${user.last_name}` : '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToMyTrips(): void {
    this.router.navigate(['/my-trips']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }
}