import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReleaseApiService } from '../../../lib/api/release-api.service';
import { Release } from '../../../lib/models/release.model';
import { CardComponent, CardBodyComponent, CardHeaderComponent } from '../../../components/ui/card/card.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-release-list',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    CardBodyComponent,
    CardHeaderComponent,
    ButtonComponent,
    SpinnerComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-white">Releases</h1>
        <app-button (click)="createRelease()">
          Create Release
        </app-button>
      </div>

      <app-spinner *ngIf="loading" />

      <app-empty-state
        *ngIf="!loading && releases.length === 0"
        [title]="'No releases found'"
        [message]="'Get started by creating your first release'"
      >
        <app-button (click)="createRelease()">
          Create Release
        </app-button>
      </app-empty-state>

      <div *ngIf="!loading && releases.length > 0" class="grid gap-4">
        <app-card *ngFor="let release of releases" class="cursor-pointer hover:shadow-lg transition-shadow" (click)="viewRelease(release._id)">
          <app-card-header>
            <h3 class="text-xl font-semibold text-white">{{ release.name }}</h3>
            <p class="text-gray-400 text-sm">{{ release.release_date | date }}</p>
          </app-card-header>
          <app-card-body>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-gray-400">Status:</span>
                <span class="px-2 py-1 rounded text-sm" 
                      [ngClass]="{
                        'bg-yellow-500/20 text-yellow-500': release.status === 'planned',
                        'bg-blue-500/20 text-blue-500': release.status === 'in_progress',
                        'bg-green-500/20 text-green-500': release.status === 'completed',
                        'bg-red-500/20 text-red-500': release.status === 'cancelled'
                      }">
                  {{ release.status }}
                </span>
              </div>
              <div class="text-gray-400">
                <span>Product Scopes:</span>
                <span class="text-white ml-2">{{ release.product_scopes.length || 0 }}</span>
              </div>
            </div>
          </app-card-body>
        </app-card>
      </div>
    </div>
  `
})
export class ReleaseListComponent implements OnInit {
  releases: Release[] = [];
  loading = false;

  constructor(
    private releaseApiService: ReleaseApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReleases();
  }

  loadReleases(): void {
    this.loading = true;
    this.releaseApiService.getAll().subscribe({
      next: (releases: Release[]) => {
        this.releases = releases;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading releases:', error);
        this.loading = false;
      }
    });
  }

  createRelease(): void {
    this.router.navigate(['/releases/create']);
  }

  viewRelease(id: string): void {
    this.router.navigate(['/releases', id]);
  }
}
