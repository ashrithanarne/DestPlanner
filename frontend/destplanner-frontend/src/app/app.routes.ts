import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { ProfileComponent } from './components/profile/profile';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'budget', loadComponent: () => import('./components/budget/budget').then(m => m.BudgetComponent), canActivate: [authGuard] },
  { path: 'budget/:tripId', loadComponent: () => import('./components/budget/budget').then(m => m.BudgetComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];