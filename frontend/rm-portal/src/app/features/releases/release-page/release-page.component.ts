import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReleaseDetailsComponent } from '../release-details/release-details.component';
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component';

@Component({
  selector: 'app-release-page',
  standalone: true,
  imports: [CommonModule, ReleaseDetailsComponent, SpinnerComponent],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-7xl">
      @if (releaseId()) {
        <app-release-details [releaseId]="releaseId()!" />
      } @else {
        <div class="flex justify-center py-12">
          <app-spinner></app-spinner>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleasePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly releaseId = signal<string | null>(null);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.releaseId.set(params['id']);
    });
  }
}
