import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  if (token) return true;
  router.navigate(['/login']);
  return false;
};