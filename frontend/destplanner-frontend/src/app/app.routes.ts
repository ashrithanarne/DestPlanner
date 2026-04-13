import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { ProfileComponent } from './components/profile/profile';
import { authGuard } from './guards/auth.guard';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { TimelineComponent } from './components/timeline/timeline.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  {
    path: 'my-trips',
    loadComponent: () => import('./components/mytrips/mytrips').then(m => m.MyTripsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'budget',
    loadComponent: () => import('./components/budget/budget').then(m => m.BudgetComponent),
    canActivate: [authGuard]
  },
  {
    path: 'budget/:tripId',
    loadComponent: () => import('./components/budget/budget').then(m => m.BudgetComponent),
    canActivate: [authGuard]
  },
  {
    path: 'trips/:tripId/packing-list',
    loadComponent: () => import('./components/packing-list/packing-list').then(m => m.PackingListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'expenses',
    loadComponent: () => import('./components/expense-split/expense-split').then(m => m.ExpenseSplitComponent),
    canActivate: [authGuard]
  },
  {
    path: 'trips/:tripId/itinerary',
    loadComponent: () => import('./components/itinerary/itinerary').then(m => m.ItineraryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'destinations',
    loadComponent: () => import('./components/destinations/destinations').then(m => m.DestinationsComponent)
  },
  {
    path: 'destinations/:id',
    loadComponent: () => import('./components/destination-detail/destination-detail').then(m => m.DestinationDetailComponent)
  },
  {
    path: 'notifications',
    component: NotificationsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'timeline/:tripId',
    component: TimelineComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' },
];