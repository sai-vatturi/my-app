import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-squad-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Squads</h1>
      <p class="text-gray-600">Squad list coming soon...</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SquadListComponent {}
