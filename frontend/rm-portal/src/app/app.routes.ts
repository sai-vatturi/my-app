import { Routes } from '@angular/router';
import { RELEASE_ROUTES } from './features/releases/releases.routes';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: '/releases',
        pathMatch: 'full'
      },
      {
        path: 'releases',
        children: RELEASE_ROUTES
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'squads',
        loadComponent: () => import('./features/squads/squad-list/squad-list.component').then(m => m.SquadListComponent)
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./components/ui/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
