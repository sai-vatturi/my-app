import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert.component.html'
})
export class AlertComponent {
  @Input() message = '';
  @Input() type: AlertType = 'info';

  get alertClasses(): string {
    const classes = {
      success: 'bg-green-50 border-green-400 text-green-800',
      error: 'bg-red-50 border-red-400 text-red-800',
      warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
      info: 'bg-blue-50 border-blue-400 text-blue-800'
    };
    return classes[this.type];
  }

  get iconColor(): string {
    const colors = {
      success: 'text-green-400',
      error: 'text-red-400',
      warning: 'text-yellow-400',
      info: 'text-blue-400'
    };
    return colors[this.type];
  }
}
