export const environment = {
  production: true,
  apiUrl: '/api/v1',
  auth: {
    storageKey: 'rm-portal-token',
    refreshKey: 'rm-portal-refresh-token'
  }
} as const;
