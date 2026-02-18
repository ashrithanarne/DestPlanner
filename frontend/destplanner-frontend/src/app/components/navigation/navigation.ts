import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';

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
export class NavigationComponent implements OnInit {

  isAuthenticated = false;
  userName = '';
  isMobileMenuOpen = false;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Only run authentication check in browser
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthentication();
    }
  }

  checkAuthentication(): void {
    const token = localStorage.getItem('token');
    this.isAuthenticated = !!token;

    if (this.isAuthenticated) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userName = user.firstName || 'User';
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    this.isAuthenticated = false;
    this.userName = '';
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
