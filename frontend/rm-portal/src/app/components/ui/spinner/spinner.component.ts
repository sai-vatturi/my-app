import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center" role="status" aria-live="polite">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span class="sr-only">Loading...</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpinnerComponent {}
