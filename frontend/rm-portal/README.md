# Release Management Portal - Frontend

A modern, production-ready Angular frontend for managing software releases, built with Angular 17+, Tailwind CSS, and ng-icons.

## Features

- **Authentication**: Login/logout with JWT token management and refresh tokens
- **Releases Management**: Full CRUD operations for releases with pagination and filtering
- **Release Details**: Comprehensive release information with workflow visualization
- **D3 Workflow Visualization**: Interactive tree-based release workflow with zoom/pan controls
- **Create Release Form**: Reactive forms with validation and auto-calculated dates
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Accessibility**: WCAG AA compliant with keyboard navigation and ARIA labels
- **Performance**: Lazy-loaded routes, OnPush change detection, and Angular Signals

## Tech Stack

- **Framework**: Angular 17+ (Standalone Components)
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: ng-icons (Heroicons outline)
- **Visualization**: D3.js for workflow trees
- **State Management**: Angular Signals
- **Forms**: Reactive Forms with validation
- **HTTP**: HttpClient with interceptors for auth and error handling

## Setup

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation

```bash
cd frontend/rm-portal
npm install
```

### Environment Configuration

Environments are in `src/environments/`. For development:
- API URL: `http://localhost:8000/api/v1`
- Auth tokens stored in localStorage

## Development server

To start a local development server, run:

```bash
ng serve
# or
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Releases
- `GET /api/v1/releases` - List releases (with pagination: skip, limit)
- `GET /api/v1/releases/:id` - Get release details
- `POST /api/v1/releases` - Create release
- `PUT /api/v1/releases/:id` - Update release
- `DELETE /api/v1/releases/:id` - Delete release

### Other Resources
- Squads: `/api/v1/squads`
- Products: `/api/v1/products`
- Runbooks: `/api/v1/runbooks`
- Files: `/api/v1/files` (with upload/download)

All endpoints support standard query params: `skip`, `limit` for pagination.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
# or for production
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory.

## Fonts & Icons

- **Body Font**: Lato (loaded from Google Fonts)
- **Heading Font**: Playfair Display (loaded from Google Fonts)
- **Icons**: @ng-icons/heroicons (outline variant)

To use icons in components:
```typescript
import { provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

providers: [provideIcons({ heroPlus })]
```

## Key Features

### Authentication Flow
1. User logs in at `/login`
2. JWT token stored in localStorage
3. Auth interceptor adds token to API requests
4. Auth guard protects routes
5. Auto-redirect on 401 errors

### Lazy Loading
- Release module lazy-loaded
- Optimized bundle sizes
- Route-based code splitting

### Accessibility
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- WCAG AA compliance

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
