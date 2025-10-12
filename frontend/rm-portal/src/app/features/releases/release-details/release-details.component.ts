import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent, CardBodyComponent, CardHeaderComponent } from '../../../components/ui/card/card.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component';
import { ReleaseApiService } from '../../../lib/api/release-api.service';
import { Release } from '../../../lib/models/release.model';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    CardBodyComponent,
    CardHeaderComponent,
    ButtonComponent,
    SpinnerComponent
  ],
  templateUrl: './release-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleaseDetailsComponent implements OnInit {
  private readonly releaseApi = inject(ReleaseApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly release = signal<Release | null>(null);

  ngOnInit() {
    const releaseId = this.route.snapshot.paramMap.get('id');
    if (!releaseId) {
      this.error.set('Release ID not found');
      this.loading.set(false);
      return;
    }

    this.releaseApi.getById(releaseId).subscribe({
      next: (release) => {
        this.release.set(release);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load release');
        this.loading.set(false);
      }
    });
  }

  onEdit() {
    const release = this.release();
    if (release) {
      this.router.navigate(['/releases', release._id, 'edit']);
    }
  }

  onBack() {
    this.router.navigate(['/releases']);
  }
}
