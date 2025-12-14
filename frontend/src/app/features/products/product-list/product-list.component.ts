import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Users, AppWindow } from 'lucide-angular';
import { ProductService } from '../../../core/services/product.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { SquadService } from '../../../core/services/squad.service';
import { ApplicationService } from '../../../core/services/application.service';
import { Product } from '../../../core/models/product.model';
import { Squad } from '../../../core/models/squad.model';
import { Application } from '../../../core/models/application.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  readonly Plus = Plus;
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;
  readonly Users = Users;
  readonly AppWindow = AppWindow;

  loading = signal(false);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);

  // Auxiliary Data
  squads = signal<Squad[]>([]);
  applications = signal<Application[]>([]);

  // Expansion State
  expandedProductId = signal<string | null>(null);

  constructor(
    public productService: ProductService,
    private businessUnitService: BusinessUnitService,
    private squadService: SquadService,
    private applicationService: ApplicationService
  ) { }

  filteredProducts = computed(() => {
    const products = this.productService.products();
    const selectedUnitId = this.businessUnitService.selectedBusinessUnitId();

    if (!selectedUnitId) {
      return products;
    }

    return products.filter(p => p.business_unit_id === selectedUnitId);
  });

  get products() {
    return this.filteredProducts;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load everything
    this.productService.getAll().subscribe({
      next: () => {
        this.squadService.getAll().subscribe(s => this.squads.set(s));
        this.applicationService.getAll().subscribe(a => this.applications.set(a));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load products');
      }
    });
  }

  toggleExpand(product: Product): void {
    const id = product.id || product._id;
    if (this.expandedProductId() === id) {
      this.expandedProductId.set(null);
    } else {
      this.expandedProductId.set(id || null);
    }
  }

  isExpanded(product: Product): boolean {
    return this.expandedProductId() === (product.id || product._id);
  }

  getSquadsForProduct(product: Product): Squad[] {
    if (!product.squads || product.squads.length === 0) return [];
    return this.squads().filter(s => product.squads?.includes(s.id || s._id || ''));
  }

  getApplicationsForProduct(product: Product): Application[] {
    if (!product.application_ids || product.application_ids.length === 0) return [];
    return this.applications().filter(a => product.application_ids?.includes(a.id || a._id || ''));
  }

  deleteProduct(product: Product): void {
    // Prevent event bubbling if triggered from row
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    const productId = product.id || product._id;
    if (!productId) return;

    this.deleting.set(productId);

    this.productService.delete(productId).subscribe({
      next: () => {
        this.deleting.set(null);
      },
      error: (err) => {
        this.deleting.set(null);
        this.error.set(err.message || 'Failed to delete product');
      }
    });
  }
}
