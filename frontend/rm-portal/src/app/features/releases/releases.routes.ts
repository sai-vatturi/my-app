import { Routes } from '@angular/router';

export const RELEASE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./release-list/release-list.component').then(m => m.ReleaseListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./create-release/create-release.component').then(m => m.CreateReleaseComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./release-page/release-page.component').then(m => m.ReleasePageComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./edit-release/edit-release.component').then(m => m.EditReleaseComponent)
  }
];
