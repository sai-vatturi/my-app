export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  auth: {
    storageKey: 'rm-portal-token',
    refreshKey: 'rm-portal-refresh-token'
  }
} as const;
