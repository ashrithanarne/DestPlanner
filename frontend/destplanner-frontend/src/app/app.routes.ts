import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { BudgetComponent } from './components/budget/budget';
 
export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'budget', component: BudgetComponent },
  { path: 'budget/:tripId', component: BudgetComponent },
  { path: '**', redirectTo: '' },
];