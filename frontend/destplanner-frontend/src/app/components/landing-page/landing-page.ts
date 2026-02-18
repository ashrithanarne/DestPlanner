import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPageComponent {

  features = [
     {
      icon: 'explore',
      title: 'Discover Destinations',
      description: 'Browse curated destinations tailored to your preferences, budget, and travel style.'
    },
    {
      icon: 'calendar_month',
      title: 'Smart Itinerary Planning',
      description: 'Create and organize detailed itineraries with our intuitive drag-and-drop interface.'
    },
    {
      icon: 'account_balance_wallet',
      title: 'Budget Tracking',
      description: 'Stay on budget with real-time expense tracking and cost estimation tools.'
    },
    {
      icon: 'groups',
      title: 'Collaborate in Real-Time',
      description: 'Plan group trips together with shared itineraries, voting, and instant updates.'
    },
    {
      icon: 'cloud',
      title: 'Cloud Storage',
      description: 'Store all your travel documents, tickets, and reservations securely in one place.'
    },
    {
      icon: 'insights',
      title: 'Personalized Recommendations',
      description: 'Get AI-powered suggestions based on your interests, climate preferences, and past trips.'
    }
  ];

  benefits = [
    { value: '60%', label: 'Time Saved' },
    { value: '20%', label: 'Cost Savings' },
    { value: '15+', label: 'Features' },
    { value: '150+', label: 'Destinations' }
  ];

  constructor(private router: Router) {}

navigateToRegister(): void {
  this.router.navigate(['/register']);
}

navigateToLogin(): void {
  this.router.navigate(['/login']);
}

  scrollToFeatures(): void {
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToHowItWorks(): void {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}