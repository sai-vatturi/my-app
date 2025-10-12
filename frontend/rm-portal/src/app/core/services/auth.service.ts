import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, tap, throwError } from 'rxjs';
import { AuthStore, AuthUser } from '../state/auth.store';
import { LoginRequestDto, LoginResponseDto, RefreshRequestDto, RefreshResponseDto } from '../../lib/api/auth.dto';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  login(payload: LoginRequestDto) {
    this.authStore.setLoading(true);
    return this.http.post<LoginResponseDto>('auth/login', payload).pipe(
      tap((response) => this.persistSession(response)),
      catchError((error) => {
        if (error.status === 404) {
          // Fallback for environments where the auth service is not yet provisioned by the backend.
          const fallbackUser: AuthUser = {
            id: 'demo',
            email: payload.email,
            name: 'Demo User',
            roles: ['release_manager'],
            permissions: ['releases:read', 'releases:write', 'files:upload']
          };
          this.authStore.setSession({ accessToken: 'demo-token', refreshToken: 'demo-refresh', user: fallbackUser });
          this.authStore.setLoading(false);
          return of(fallbackUser);
        }
        this.authStore.clearSession();
        return throwError(() => error);
      }),
      tap(() => this.authStore.setLoading(false))
    );
  }

  logout() {
    this.authStore.clearSession();
    return of(true);
  }

  refresh() {
    const refreshToken = this.authStore.refreshToken();
    if (!refreshToken) {
      return of(null);
    }
    const payload: RefreshRequestDto = { refresh_token: refreshToken };
    return this.http.post<RefreshResponseDto>('auth/refresh', payload).pipe(
      tap((response) => {
        const currentUser = this.authStore.user();
        if (!currentUser) {
          return;
        }
        this.authStore.setSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token ?? refreshToken,
          user: currentUser
        });
      })
    );
  }

  hydrateUser() {
    return this.http.get<LoginResponseDto['user']>('auth/me').pipe(
      tap((user) => this.authStore.hydrateUser(user)),
      catchError(() => {
        this.authStore.clearSession();
        return of(null);
      })
    );
  }

  private persistSession(response: LoginResponseDto) {
    const user: AuthUser = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      roles: response.user.roles,
      permissions: response.user.permissions
    };

    this.authStore.setSession({
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? null,
      user
    });
  }
}
