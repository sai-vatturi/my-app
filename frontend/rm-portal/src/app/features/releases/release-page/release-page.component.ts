import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReleaseDetailsComponent } from '../release-details/release-details.component';

@Component({
  selector: 'app-release-page',
  standalone: true,
  imports: [CommonModule, ReleaseDetailsComponent],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-7xl">
      <app-release-details />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleasePageComponent {
}
