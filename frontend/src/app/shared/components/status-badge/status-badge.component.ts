import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <span [ngClass]="badgeClass" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">
      {{ getStatusLabel() }}
    </span>
  `
})
export class StatusBadgeComponent {
    @Input() status: string = '';
    @Input() type: 'status' | 'type' = 'status';

    get badgeClass(): string {
        if (this.type === 'type') {
            return this.getTypeBadgeClass(this.status);
        }
        return this.getStatusBadgeClass(this.status);
    }

    getStatusLabel(): string {
        if (!this.status) return '';
        return this.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    private getTypeBadgeClass(type: string): string {
        const classes: Record<string, string> = {
            'Major release': 'bg-blue-100 text-blue-800',
            'Hotfix': 'bg-orange-100 text-orange-800',
            'Data Patch': 'bg-purple-100 text-purple-800',
            'Hotfix Data Patch': 'bg-red-100 text-red-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    private getStatusBadgeClass(status: string): string {
        const classes: Record<string, string> = {
            'planned': 'bg-gray-100 text-gray-800',
            'in_progress': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }
}
