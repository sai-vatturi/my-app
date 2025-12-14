
import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Action } from 'rxjs/internal/scheduler/Action';
import { from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { Router, ActivatedRoute, RouterModule, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ApplicationService } from '../../../core/services/application.service';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

import { WorkflowD3ChartComponent } from '../../../shared/components/workflow-d3-chart/workflow-d3-chart.component';
import { TimelineEditorV2Component } from '../../../shared/components/timeline-editor-v2/timeline-editor-v2.component';
import { ReleaseAttachmentsComponent } from '../release-attachments/release-attachments.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { StageActionCardComponent } from '../../../shared/components/stage-action-card/stage-action-card.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent,
    WorkflowD3ChartComponent,
    StageActionCardComponent,

    ReleaseAttachmentsComponent,
    FormsModule
  ],
  templateUrl: './release-details.component.html',
})
export class ReleaseDetailsComponent implements OnInit {
  release = signal<Release | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  products = signal<Product[]>([]);
  productMap = new Map<string, string>();
  applicationMap = new Map<string, string>();
  expandedScopes = new Set<number>(); // Track which product scopes are expanded
  workflow = signal<WorkflowTemplate | null>(null);

  // Interactive Graph State
  selectedStageInfo = signal<{
    product: any; // ReleaseProduct
    stage: any;   // WorkflowStage
    state: any;   // WorkflowStageState
    status: 'completed' | 'current' | 'upcoming';
  } | null>(null);

  cardPosition = signal<{ x: number, y: number } | null>(null);
  processingAction = signal(false);

  @ViewChild('workflowContainer') workflowContainer!: ElementRef;

  // State for modals
  editingProductIndex = signal<number | null>(null);
  addingProduct = signal<boolean>(false);
  showingAttachments = signal(false);

  selectedProduct = computed(() => {
    const release = this.release();
    return null;
  });

  associatedApplications = computed(() => {
    const release = this.release();
    const allProducts = this.availableProducts();
    this.applicationsLoaded(); // Dependency to trigger re-calculation when map is populated

    if (!release || !allProducts.length) return [];

    const appNames = new Set<string>();
    release.products.forEach(rp => {
      const product = allProducts.find(p => (p.id || p._id) === rp.product_id);
      if (product && product.application_ids) {
        product.application_ids.forEach(appId => {
          const appName = this.applicationMap.get(appId);
          if (appName) appNames.add(appName);
        });
      }
    });
    return Array.from(appNames).sort();
  });

  newProduct: Partial<ReleaseProduct> & { product_id: string; scope_description: string; fixed_versions: any[]; pocs: string[] } = {
    product_id: '',
    scope_description: '',
    fixed_versions: [],
    pocs: []
  };
  availableProducts = signal<Product[]>([]);
  businessUnitName = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private releaseService: ReleaseService,
    private productService: ProductService,
    private applicationService: ApplicationService,
    private workflowService: WorkflowService,
    private businessUnitService: BusinessUnitService,
    private fb: FormBuilder
  ) { }

  applicationsLoaded = signal(false); // Helper to trigger computed
  currentDateSGT = signal<string>('');
  private timeInterval: any;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRelease(id);
    }
    this.loadProducts();
    this.loadApplications();

    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  updateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Singapore',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    this.currentDateSGT.set(new Intl.DateTimeFormat('en-US', options).format(now));
  }

  loadApplications(): void {
    this.applicationService.getAll().subscribe(apps => {
      apps.forEach(a => {
        const id = a.id || a._id;
        if (id) this.applicationMap.set(id, a.name);
      });
      // Trigger reactivity if needed, but computed depends on availableProducts mostly
      // We might need a signal for appMap loaded if computed doesn't pick up map changes directly 
      // (Maps are not reactive in Angular signals automatically unless the map reference changes).
      // However, since we are setting it once, we can force re-evaluation by updating a dummy signal or 
      // better yet, just using a signal for the apps list.
      this.applicationsLoaded.set(true);
    });
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





  openAttachmentsDialog(): void {
    this.showingAttachments.set(true);
  }

  closeAttachmentsDialog(): void {
    this.showingAttachments.set(false);
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

        // Load Business Unit Name
        if (release.business_unit_id) {
          this.businessUnitService.getById(release.business_unit_id).subscribe({
            next: (bu) => this.businessUnitName.set(bu.name),
            error: () => this.businessUnitName.set(null)
          });
        }

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
    // Refresh selected stage info if open
    if (this.selectedStageInfo()) {
      this.refreshSelectedStageInfo(updatedRelease);
    }
  }

  // --- Graph Interaction ---

  onStageClicked(event: { productId: string, stageOrder: number, event: MouseEvent, element: any }): void {
    const release = this.release();
    const workflow = this.workflow();
    if (!release || !workflow) return;

    const product = release.products.find(p => p.product_id === event.productId);
    const stage = workflow.stages.find(s => s.order === event.stageOrder);

    if (!product || !stage) return;

    // Determine status
    const workflowStates = product.workflow_states || {};
    const state = workflowStates[stage.order.toString()] || null;
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

    if (state?.status) {
      status = 'completed';
    } else {
      // Recalculate 'current' logic similar to chart comp
      const sortedStages = [...workflow.stages].sort((a, b) => a.order - b.order);
      const firstIncomplete = sortedStages.find(s => {
        const sState = workflowStates[s.order.toString()];
        return !sState || !sState.status;
      });
      if (firstIncomplete?.order === stage.order) status = 'current';
    }

    this.selectedStageInfo.set({ product, stage, state, status });

    // Correct Positioning relative to container
    if (this.workflowContainer) {
      const containerRect = this.workflowContainer.nativeElement.getBoundingClientRect();
      const targetRect = event.element; // This is the SVG element rect (viewport relative)

      // Calculate relative coordinates
      // We want to position it to the right of the node
      let x = targetRect.right - containerRect.left + 10;
      let y = targetRect.top - containerRect.top;

      // Boundary check (Prevent overflow to the right)
      const CARD_WIDTH = 320; // Approx width
      if (x + CARD_WIDTH > containerRect.width) {
        // Flip to left side
        x = targetRect.left - containerRect.left - CARD_WIDTH - 10;
      }

      this.cardPosition.set({ x, y });
    } else {
      // Fallback (though container should exist)
      this.cardPosition.set({ x: event.event.clientX, y: event.event.clientY });
    }
  }

  closeStageCard(): void {
    this.selectedStageInfo.set(null);
    this.cardPosition.set(null);
  }

  refreshSelectedStageInfo(release: Release): void {
    const current = this.selectedStageInfo();
    if (!current) return;

    const product = release.products.find(p => p.product_id === current.product.product_id);
    if (!product) return; // Should not happen

    const workflowStates = product.workflow_states || {};
    const state = workflowStates[current.stage.order.toString()] || null;

    // Update state in the signal
    this.selectedStageInfo.update(prev => prev ? ({ ...prev, product, state }) : null);

    // We might need to re-evaluate 'status' if it changed (e.g. current -> completed)
    // For now, let's trust the re-render or user closing it.
    // Actually if they advanced, it became completed.
    if (current.status === 'current' && state?.status) {
      this.selectedStageInfo.update(prev => prev ? ({ ...prev, status: 'completed' }) : null);
    }
  }

  canRevertStage(): boolean {
    const info = this.selectedStageInfo();
    if (!info) return false;
    // can revert if current stage > 1, meaning there is a previous stage to revert back to
    // The backend 'revert' logic reverts the *last completed* stage.
    // So if we are at Stage 2 (Current), calling revert will un-complete Stage 1.
    // This matches "Get back to previous stage".
    return info.status === 'current' && info.stage.order > 1;
  }

  revertStageFromCard(): void {
    const info = this.selectedStageInfo();
    if (!info) return;

    if (!confirm('Are you sure you want to revert to the previous stage? This will mark the last completed stage as incomplete.')) {
      return;
    }

    this.processingAction.set(true);
    this.releaseService.revertProductStage(this.release()!.id || this.release()!._id!, info.product.product_id)
      .subscribe({
        next: (updated) => {
          this.processingAction.set(false);
          this.onReleaseUpdated(updated);
          this.closeStageCard(); // Close after revert as state changes significantly
        },
        error: (err) => {
          this.processingAction.set(false);
          this.error.set(err.error?.detail || 'Failed to revert stage');
        }
      });
  }

  // Actions from Card
  advanceStageFromCard(): void {
    const info = this.selectedStageInfo();
    if (!info) return;

    this.processingAction.set(true);
    this.releaseService.advanceProductStage(this.release()!.id || this.release()!._id!, info.product.product_id)
      .subscribe({
        next: (updated) => {
          this.processingAction.set(false);
          this.onReleaseUpdated(updated);
          // Optionally close card or keep open to show success?
          // Closing feels natural after "Advance" which moves focus to next stage usually.
          this.closeStageCard();

          // If there's a next stage, we could potentially auto-select it?
          // Let's keep it simple for now.
        },
        error: (err) => {
          this.processingAction.set(false);
          this.error.set(err.message);
        }
      });
  }

  uploadAttachmentFromCard(files: File[]): void {
    if (files.length === 0) return;
    const info = this.selectedStageInfo();
    if (!info) return;

    this.processingAction.set(true);

    // Process files sequentially
    from(files).pipe(
      concatMap(file => this.releaseService.uploadStageAttachment(
        this.release()!.id || this.release()!._id!,
        info.product.product_id,
        info.stage.order,
        file
      )),
      toArray() // Wait for all to complete
    ).subscribe({
      next: (responses) => {
        // The last response contains the latest state
        if (responses.length > 0) {
          this.onReleaseUpdated(responses[responses.length - 1]);
        }
        this.processingAction.set(false);
      },
      error: (err: any) => {
        this.processingAction.set(false);
        this.error.set(err.message || 'Error uploading files');
      }
    });
  }

  deleteAttachmentFromCard(file: any): void {
    const info = this.selectedStageInfo();
    if (!info || !file.id) return;

    if (!confirm(`Are you sure you want to delete ${file.filename}?`)) return;

    this.processingAction.set(true);
    this.releaseService.deleteStageAttachment(
      this.release()!.id || this.release()!._id!,
      info.product.product_id,
      info.stage.order,
      file.id
    ).subscribe({
      next: (updated) => {
        this.processingAction.set(false);
        this.onReleaseUpdated(updated);
      },
      error: (err) => {
        this.processingAction.set(false);
        this.error.set(err.message);
      }
    });
  }

  downloadAttachmentFromCard(file: any): void {
    if (!file || !file.id) return;
    const baseUrl = environment.apiUrl;
    // Use hidden iframe or window.open logic (service logic preferred usually but this works for direct links)
    // Actually use the same logic as release-attachments
    const url = `${baseUrl}/files/${file.id}/download`;
    window.open(url, '_blank');
  }

  downloadAllAttachmentsFromCard(): void {
    const info = this.selectedStageInfo();
    if (!info) return;

    const attachments = info.state?.attachments || [];
    // If we have legacy single attachment, include it if not in array
    if (info.state?.attachment_id && !attachments.find((a: any) => a.id === info.state!.attachment_id)) {
      attachments.push({
        id: info.state.attachment_id,
        filename: info.state.attachment_filename || 'attachment'
      });
    }

    if (attachments.length === 0) return;

    if (attachments.length > 5) {
      if (!confirm(`You are about to download ${attachments.length} files. Continue?`)) return;
    }

    const baseUrl = environment.apiUrl;
    attachments.forEach((file: any) => {
      const url = `${baseUrl}/files/${file.id}/download`;
      // Trigger download in new window/tab
      window.open(url, '_blank');
    });
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
