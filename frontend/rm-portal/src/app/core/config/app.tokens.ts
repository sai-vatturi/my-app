import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  apiUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export interface AuthStorageKeys {
  tokenKey: string;
  refreshTokenKey: string;
}

export const AUTH_STORAGE_KEYS = new InjectionToken<AuthStorageKeys>('AUTH_STORAGE_KEYS');
