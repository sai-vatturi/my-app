import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { WorkflowProgressComponent } from '../../../shared/components/workflow-progress/workflow-progress.component';
import { WorkflowD3ChartComponent } from '../../../shared/components/workflow-d3-chart/workflow-d3-chart.component';
import { TimelineEditorV2Component } from '../../../shared/components/timeline-editor-v2/timeline-editor-v2.component';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AlertComponent,
    WorkflowD3ChartComponent,
    TimelineEditorV2Component,
    WorkflowProgressComponent
  ],
  templateUrl: './release-details.component.html',
})
export class ReleaseDetailsComponent implements OnInit {
  release = signal<Release | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  products = signal<Product[]>([]);
  productMap = new Map<string, string>();
  expandedScopes = new Set<number>(); // Track which product scopes are expanded
  workflow = signal<WorkflowTemplate | null>(null);

  // State for modals
  // State for modals
  editingProductIndex = signal<number | null>(null);
  addingProduct = signal<boolean>(false);
  selectedProductId = signal<string | null>(null);

  selectedProduct = computed(() => {
    const release = this.release();
    const productId = this.selectedProductId();
    if (!release || !productId) return null;
    return release.products.find(p => p.product_id === productId) || null;
  });

  newProduct: Partial<ReleaseProduct> & { product_id: string; scope_description: string; fixed_versions: any[]; pocs: string[] } = {
    product_id: '',
    scope_description: '',
    fixed_versions: [],
    pocs: []
  };
  availableProducts = signal<Product[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private releaseService: ReleaseService,
    private productService: ProductService,
    private workflowService: WorkflowService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRelease(id);
    }
    this.loadProducts();
  }



  loadProducts(): void {
    this.productService.getAll().subscribe(products => {
      this.availableProducts.set(products);
      products.forEach(p => {
        const id = p.id || p._id;
        if (id) this.productMap.set(id, p.name);
      });
    });
  }

  getProductName(productId: string): string {
    return this.productMap.get(productId) || productId;
  }



  openWorkflowDialog(productId: string): void {
    this.selectedProductId.set(productId);
  }

  closeWorkflowDialog(): void {
    this.selectedProductId.set(null);
  }

  editProduct(index: number): void {
    this.editingProductIndex.set(index);
  }

  closeProductDialog(): void {
    this.editingProductIndex.set(null);
  }

  openAddProductDialog(): void {
    this.newProduct = {
      product_id: '',
      scope_description: '',
      fixed_versions: [],
      pocs: []
    };
    this.addingProduct.set(true);
  }

  closeAddProductDialog(): void {
    this.addingProduct.set(false);
  }

  saveNewProduct(): void {
    if (!this.newProduct.product_id) return;

    const currentRelease = this.release();
    if (!currentRelease) return;

    const updatedProducts = [...currentRelease.products, this.newProduct];

    const releaseId = currentRelease.id || currentRelease._id;
    if (!releaseId) return;

    this.releaseService.update(releaseId, { products: updatedProducts }).subscribe({
      next: (updated) => {
        this.release.set(updated);
        this.closeAddProductDialog();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to add product');
      }
    });
  }

  // Helper for new product form
  addNewProductPoc(): void {
    this.newProduct.pocs.push('');
  }

  removeNewProductPoc(index: number): void {
    this.newProduct.pocs.splice(index, 1);
  }

  updateNewProductPoc(value: string, index: number): void {
    const updatedPocs = [...this.newProduct.pocs];
    updatedPocs[index] = value;
    this.newProduct.pocs = updatedPocs;
  }

  addNewProductVersion(): void {
    this.newProduct.fixed_versions.push({ jira_board_id: '', fixed_version: '' });
  }

  removeNewProductVersion(index: number): void {
    this.newProduct.fixed_versions.splice(index, 1);
  }

  saveProduct(updatedProduct: any): void {
    const index = this.editingProductIndex();
    if (index === null) return;

    const currentRelease = this.release();
    if (!currentRelease) return;

    const updatedProducts = [...currentRelease.products];
    updatedProducts[index] = updatedProduct;

    const releaseId = currentRelease.id || currentRelease._id;
    if (!releaseId) return;

    this.releaseService.update(releaseId, { products: updatedProducts }).subscribe({
      next: (updated) => {
        this.release.set(updated);
        this.closeProductDialog();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to update product');
      }
    });
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  updatePoc(value: string, productIndex: number, pocIndex: number): void {
    const currentRelease = this.release();
    if (currentRelease && currentRelease.products[productIndex]) {
      const updatedPocs = [...currentRelease.products[productIndex].pocs];
      updatedPocs[pocIndex] = value;
      currentRelease.products[productIndex].pocs = updatedPocs;
    }
  }

  addPoc(productIndex: number): void {
    const currentRelease = this.release();
    if (currentRelease && currentRelease.products[productIndex]) {
      currentRelease.products[productIndex].pocs.push('');
    }
  }

  removePoc(productIndex: number, pocIndex: number): void {
    const currentRelease = this.release();
    if (currentRelease && currentRelease.products[productIndex]) {
      currentRelease.products[productIndex].pocs.splice(pocIndex, 1);
    }
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
        // Load workflow for this release type
        if (release.release_type) {
          this.workflowService.getByReleaseType(release.release_type).subscribe({
            next: (wf) => {
              this.workflow.set(wf);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              // Continue even if workflow load fails
            }
          });
        } else {
          this.loading.set(false);
        }
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

  onReleaseUpdated(updatedRelease: Release): void {
    this.release.set(updatedRelease);
  }
}
