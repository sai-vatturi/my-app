import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses()">
      <ng-content></ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');

  badgeClasses() {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    const variants = {
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      default: 'bg-gray-100 text-gray-800'
    };

    return `${base} ${variants[this.variant()]}`;
  }
}
