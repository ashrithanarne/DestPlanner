import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { RegisterComponent } from './auth/register/register';


export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '' }
];
