import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading-spinner.component.html',
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading...';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get sizeClass(): string {
    const sizes = {
      sm: 'h-6 w-6 border-primary-600',
      md: 'h-12 w-12 border-primary-600',
      lg: 'h-16 w-16 border-primary-600'
    };
    return sizes[this.size];
  }
}
