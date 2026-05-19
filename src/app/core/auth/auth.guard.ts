import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (auth.isAuthenticated()) return true;
      return router.parseUrl('/login');
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (!auth.isAuthenticated()) return true;
      return router.parseUrl('/projects');
    }),
  );
};
