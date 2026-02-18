import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: '**', redirectTo: '' }
];
