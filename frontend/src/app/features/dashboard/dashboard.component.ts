import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Rocket, Package, Users, Calendar } from 'lucide-angular';
import { ReleaseService } from '../../core/services/release.service';
import { ProductService } from '../../core/services/product.service';
import { SquadService } from '../../core/services/squad.service';
import { Release } from '../../core/models/release.model';

interface DashboardStats {
  totalReleasesThisYear: number;
  totalProducts: number;
  totalSquads: number;
  upcomingReleaseDate: string | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  readonly Rocket = Rocket;
  readonly Package = Package;
  readonly Users = Users;
  readonly Calendar = Calendar;

  stats = signal<DashboardStats>({
    totalReleasesThisYear: 0,
    totalProducts: 0,
    totalSquads: 0,
    upcomingReleaseDate: null
  });

  activeReleases = signal<number>(0);
  completedReleases = signal<number>(0);
  currentYear = new Date().getFullYear();

  constructor(
    private releaseService: ReleaseService,
    private productService: ProductService,
    private squadService: SquadService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    const currentYear = new Date().getFullYear();

    // Load releases
    this.releaseService.getAll().subscribe(releases => {
      const releasesThisYear = releases.filter(r => {
        const releaseYear = new Date(r.release_date).getFullYear();
        return releaseYear === currentYear;
      });

      const upcomingRelease = this.findUpcomingRelease(releases);
      const upcomingDate = upcomingRelease 
        ? this.formatDate(upcomingRelease.release_date)
        : null;

      // Count active and completed releases
      const active = releases.filter(r => r.status?.toLowerCase() !== 'completed').length;
      const completed = releases.filter(r => r.status?.toLowerCase() === 'completed').length;

      this.stats.update(s => ({
        ...s,
        totalReleasesThisYear: releasesThisYear.length,
        upcomingReleaseDate: upcomingDate
      }));

      this.activeReleases.set(active);
      this.completedReleases.set(completed);
    });

    // Load products
    this.productService.getAll().subscribe(products => {
      this.stats.update(s => ({
        ...s,
        totalProducts: products.length
      }));
    });

    // Load squads
    this.squadService.getAll().subscribe(squads => {
      this.stats.update(s => ({
        ...s,
        totalSquads: squads.length
      }));
    });
  }

  private findUpcomingRelease(releases: Release[]): Release | null {
    const now = new Date();
    const futureReleases = releases
      .filter(r => new Date(r.release_date) > now)
      .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

    return futureReleases.length > 0 ? futureReleases[0] : null;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }
}
