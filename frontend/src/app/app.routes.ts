import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/releases/release-calendar/release-calendar.component').then(m => m.ReleaseCalendarComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'products/create',
        loadComponent: () => import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'squads',
        loadComponent: () => import('./features/squads/squad-list/squad-list.component').then(m => m.SquadListComponent)
      },
      {
        path: 'squads/create',
        loadComponent: () => import('./features/squads/squad-form/squad-form.component').then(m => m.SquadFormComponent)
      },
      {
        path: 'squads/:id/edit',
        loadComponent: () => import('./features/squads/squad-form/squad-form.component').then(m => m.SquadFormComponent)
      },
      {
        path: 'releases',
        loadComponent: () => import('./features/releases/release-list/release-list.component').then(m => m.ReleaseListComponent)
      },
      {
        path: 'releases/create',
        loadComponent: () => import('./features/releases/release-form/release-form.component').then(m => m.ReleaseFormComponent)
      },
      {
        path: 'releases/:id',
        loadComponent: () => import('./features/releases/release-details/release-details.component').then(m => m.ReleaseDetailsComponent)
      },
      {
        path: 'releases/:id/edit',
        loadComponent: () => import('./features/releases/release-form/release-form.component').then(m => m.ReleaseFormComponent)
      },
      {
        path: 'workflows',
        loadComponent: () => import('./features/workflows/workflow-management/workflow-management.component').then(m => m.WorkflowManagementComponent)
      },
      {
        path: 'business-units',
        loadComponent: () => import('./features/business-units/business-unit-list/business-unit-list.component').then(m => m.BusinessUnitListComponent)
      },
      {
        path: 'business-units/new',
        loadComponent: () => import('./features/business-units/business-unit-form/business-unit-form.component').then(m => m.BusinessUnitFormComponent)
      },
      {
        path: 'business-units/:id',
        loadComponent: () => import('./features/business-units/business-unit-details/business-unit-details.component').then(m => m.BusinessUnitDetailsComponent)
      },
      {
        path: 'business-units/:id/edit',
        loadComponent: () => import('./features/business-units/business-unit-form/business-unit-form.component').then(m => m.BusinessUnitFormComponent)
      },
      {
        path: 'applications',
        loadComponent: () => import('./features/applications/application-list/application-list.component').then(m => m.ApplicationListComponent)
      },
      {
        path: 'applications/new',
        loadComponent: () => import('./features/applications/application-form/application-form.component').then(m => m.ApplicationFormComponent)
      },
      {
        path: 'applications/:id/edit',
        loadComponent: () => import('./features/applications/application-form/application-form.component').then(m => m.ApplicationFormComponent)
      }
    ]
  }
];

