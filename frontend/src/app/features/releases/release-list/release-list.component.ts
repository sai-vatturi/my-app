import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { Release } from '../../../core/models/release.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-release-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent,
    StatusBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-list.component.html',
})
export class ReleaseListComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);

  constructor(
    public releaseService: ReleaseService,
    private businessUnitService: BusinessUnitService
  ) { }

  filteredReleases = computed(() => {
    const releases = this.releaseService.releases();
    const selectedUnitId = this.businessUnitService.selectedBusinessUnitId();

    if (!selectedUnitId) {
      return releases;
    }

    return releases.filter(r => r.business_unit_id === selectedUnitId);
  });

  get releases() {
    return this.filteredReleases;
  }

  ngOnInit(): void {
    this.loadReleases();
  }

  loadReleases(): void {
    this.loading.set(true);
    this.error.set(null);
    this.releaseService.getAll().subscribe({
      next: () => this.loading.set(false),
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load releases'); }
    });
  }

  deleteRelease(release: Release): void {
    if (!confirm(`Are you sure you want to delete "${release.name}"?`)) return;
    const releaseId = release.id || release._id;
    if (!releaseId) return;
    this.deleting.set(releaseId);
    this.releaseService.delete(releaseId).subscribe({
      next: () => this.deleting.set(null),
      error: (err) => { this.deleting.set(null); this.error.set(err.message || 'Failed to delete release'); }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
