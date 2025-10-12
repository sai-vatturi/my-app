import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AUTH_STORAGE_KEYS } from '../config/app.tokens';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKeys = inject(AUTH_STORAGE_KEYS);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly accessTokenSignal = signal<string | null>(this.readStorage(this.storageKeys.tokenKey));
  private readonly refreshTokenSignal = signal<string | null>(this.readStorage(this.storageKeys.refreshTokenKey));
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly loadingSignal = signal(false);

  readonly token = this.accessTokenSignal.asReadonly();
  readonly refreshToken = this.refreshTokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

  setLoading(state: boolean): void {
    this.loadingSignal.set(state);
  }

  setSession(params: { accessToken: string; refreshToken?: string | null; user: AuthUser }): void {
    this.accessTokenSignal.set(params.accessToken);
    this.refreshTokenSignal.set(params.refreshToken ?? null);
    this.userSignal.set(params.user);

    this.writeStorage(this.storageKeys.tokenKey, params.accessToken);
    if (params.refreshToken) {
      this.writeStorage(this.storageKeys.refreshTokenKey, params.refreshToken);
    }
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);

    this.removeStorage(this.storageKeys.tokenKey);
    this.removeStorage(this.storageKeys.refreshTokenKey);
  }

  hydrateUser(user: AuthUser | null): void {
    this.userSignal.set(user);
  }

  private readStorage(key: string): string | null {
    if (!this.browser) {
      return null;
    }
    return localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string): void {
    if (!this.browser) {
      return;
    }
    localStorage.setItem(key, value);
  }

  private removeStorage(key: string): void {
    if (!this.browser) {
      return;
    }
    localStorage.removeItem(key);
  }
}
