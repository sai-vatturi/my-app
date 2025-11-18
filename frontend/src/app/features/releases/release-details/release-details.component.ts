import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { Release } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-details.component.html',
  })
export class ReleaseDetailsComponent implements OnInit {
  release = signal<Release | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  products = signal<Product[]>([]);
  productMap = new Map<string, string>();
  expandedScopes = new Set<number>(); // Track which product scopes are expanded

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private releaseService: ReleaseService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load products first, then load release
      this.loadProducts(id);
    }
  }

  loadProducts(releaseId: string): void {
    this.loading.set(true);
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products.set(products);
        products.forEach(p => {
          const id = p.id || p._id;
          if (id) this.productMap.set(id, p.name);
        });
        // Now load the release after products are loaded
        this.loadRelease(releaseId);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load products');
      }
    });
  }

  getProductName(productId: string): string {
    return this.productMap.get(productId) || productId;
  }

  editProduct(index: number): void {
    const releaseId = this.release()?.id || this.release()?._id;
    if (!releaseId) return;
    this.router.navigate(['/releases', releaseId, 'edit'], { 
      queryParams: { editProduct: index } 
    });
  }

  toggleScopeExpansion(index: number): void {
    if (this.expandedScopes.has(index)) {
      this.expandedScopes.delete(index);
    } else {
      this.expandedScopes.add(index);
    }
  }

  isScopeExpanded(index: number): boolean {
    return this.expandedScopes.has(index);
  }

  truncateScope(scope: string | undefined, maxLength: number = 100): string {
    if (!scope) return 'No scope provided';
    if (scope.length <= maxLength) return scope;
    return scope.substring(0, maxLength) + '...';
  }

  loadRelease(id: string): void {
    this.loading.set(true);
    this.releaseService.getById(id).subscribe({
      next: (release) => {
        this.release.set(release);
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load release'); }
    });
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      'Major release': 'bg-blue-100 text-blue-800',
      'Hotfix': 'bg-orange-100 text-orange-800',
      'Data patch': 'bg-purple-100 text-purple-800',
      'Hotfix & Data patch': 'bg-red-100 text-red-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'planned': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStateBadgeClass(state: string): string {
    const classes: Record<string, string> = {
      'dev': 'bg-gray-100 text-gray-800',
      'sit': 'bg-blue-100 text-blue-800',
      'uat': 'bg-yellow-100 text-yellow-800',
      'stg': 'bg-orange-100 text-orange-800',
      'prod': 'bg-green-100 text-green-800'
    };
    return classes[state] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
