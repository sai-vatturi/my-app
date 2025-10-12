import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(AuthStore);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        store.clearSession();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
