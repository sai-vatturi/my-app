import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
      <div class="text-center">
        <h1 class="text-9xl font-heading font-bold text-gray-200">404</h1>
        <p class="text-2xl font-semibold text-gray-900 mt-4">Page not found</p>
        <p class="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
        <a href="/" class="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Go to Dashboard
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {}
