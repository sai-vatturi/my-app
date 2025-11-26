import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Release } from '../../../core/models/release.model';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
    selector: 'app-release-card',
    standalone: true,
    imports: [CommonModule, RouterModule, StatusBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="bg-white rounded-xl shadow-md border border-gray-100 p-4">
      <div class="flex justify-between items-start mb-3">
        <a [routerLink]="['/releases', release.id]" class="text-lg font-semibold text-primary-600 hover:text-primary-700">
          {{ release.name }}
        </a>
        <div class="flex gap-2">
          <a [routerLink]="['/releases', release.id]" class="text-primary-600 hover:text-primary-700 text-sm">View</a>
          <a [routerLink]="['/releases', release.id, 'edit']" class="text-primary-600 hover:text-primary-700 text-sm">Edit</a>
        </div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-gray-500">Type:</span>
          <app-status-badge [status]="release.release_type" type="type">{{ release.release_type }}</app-status-badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-500">Status:</span>
          <app-status-badge [status]="release.status" type="status">{{ release.status }}</app-status-badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-500">Date:</span>
          <span class="text-gray-900">{{ formatDate(release.release_date) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-500">Products:</span>
          <span class="text-gray-900">{{ release.products.length }}</span>
        </div>
        <div class="flex items-center gap-2" *ngIf="release.chg_number">
          <span class="text-gray-500">CHG:</span>
          <a href="#" class="text-primary-600 hover:text-primary-700 font-medium">{{ release.chg_number }}</a>
        </div>
        <div class="pt-2">
          <button (click)="onDelete.emit(release)" class="text-red-600 hover:text-red-700 text-sm font-medium" [disabled]="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ReleaseCardComponent {
    @Input({ required: true }) release!: Release;
    @Input() isDeleting = false;
    @Output() onDelete = new EventEmitter<Release>();

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
}
