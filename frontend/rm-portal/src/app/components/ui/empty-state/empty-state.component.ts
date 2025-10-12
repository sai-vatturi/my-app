import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroInboxArrowDown } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ heroInboxArrowDown })],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ng-icon [name]="icon()" class="text-gray-400 mb-4" size="48"></ng-icon>
      <h3 class="text-lg font-heading font-semibold text-gray-900 mb-2">{{ title() }}</h3>
      <p class="text-gray-600 max-w-md">{{ message() }}</p>
      <div class="mt-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  icon = input('heroInboxArrowDown');
  title = input('No data found');
  message = input('There are no items to display at the moment.');
}
