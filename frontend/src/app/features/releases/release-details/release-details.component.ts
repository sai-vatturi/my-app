import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { Release, ReleaseNode, NodeType } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { Workflow, WorkflowStage, ProductWorkflowState } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ReleaseWorkflowComponent } from '../release-workflow/release-workflow.component';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent, ReleaseWorkflowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-details.component.html',
  })
export class ReleaseDetailsComponent implements OnInit {
  release = signal<Release | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  workflowData = signal<ReleaseNode[]>([]);
  products = signal<Product[]>([]);
  productMap = new Map<string, string>();
  expandedScopes = new Set<number>(); // Track which product scopes are expanded

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private releaseService: ReleaseService,
    private productService: ProductService,
    private workflowService: WorkflowService
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
        // Load workflow data if release has a workflow
        if (release.workflow_id) {
          this.loadWorkflow(release.workflow_id);
        } else {
          this.workflowData.set(this.generateWorkflowData(release));
        }
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load release'); }
    });
  }

  loadWorkflow(workflowId: string): void {
    this.workflowService.getById(workflowId).subscribe({
      next: (workflow) => {
        this.workflow = workflow;
        const release = this.release();
        if (release) {
          this.workflowData.set(this.generateWorkflowData(release, workflow));
        }
      },
      error: (err) => {
        console.error('Failed to load workflow:', err);
        this.workflow = null;
        // Fall back to basic workflow data
        const release = this.release();
        if (release) {
          this.workflowData.set(this.generateWorkflowData(release));
        }
      }
    });
  }

  private generateWorkflowData(release: Release, workflow?: Workflow): ReleaseNode[] {
    if (!workflow) {
      // Fallback to basic structure without workflow
      return release.products.map(product => {
        const productName = this.getProductName(product.product_id);
        return {
          id: product.product_id,
          label: productName,
          type: 'system',
          children: [{
            id: `${product.product_id}-release`,
            label: release.name,
            type: 'release',
            children: [{
              id: `${product.product_id}-env`,
              label: this.getProductName(product.product_id),
              type: 'env',
              children: []
            }]
          }]
        };
      });
    }

    // Generate workflow data with products as top-level nodes
    return release.products.map(product => {
      const productName = this.getProductName(product.product_id);
      const productWorkflowState = release.product_workflow_states?.[product.product_id];
      
      // Create stage progression for this product
      const stageNodes: ReleaseNode[] = workflow.stages.map((stage, stageIndex) => {
        const isCompleted = productWorkflowState && productWorkflowState.current_stage_index > stageIndex;
        const isCurrent = productWorkflowState && productWorkflowState.current_stage_index === stageIndex;
        const isUpcoming = productWorkflowState && productWorkflowState.current_stage_index < stageIndex;
        
        let stageLabel = stage.name;
        if (isCompleted) stageLabel += ' ✓';
        else if (isCurrent) stageLabel += ' →';
        
        return {
          id: `${product.product_id}-stage-${stageIndex}`,
          label: stageLabel,
          type: isCompleted ? 'stage' : isCurrent ? 'stage' : 'stage',
          children: []
        };
      });

      return {
        id: product.product_id,
        label: productName,
        type: 'system',
        children: [{
          id: `${product.product_id}-release`,
          label: release.name,
          type: 'release',
          children: stageNodes
        }]
      };
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

  advanceStage(productId: string): void {
    const release = this.release();
    if (!release || !release.workflow_id) return;

    const releaseId = release.id || release._id;
    if (!releaseId) return;

    // Get current state
    const currentState = release.product_workflow_states?.[productId];
    if (!currentState) return;

    // Advance to next stage
    const newStageIndex = currentState.current_stage_index + 1;
    
    // Update the state
    const updatedStates = {
      ...release.product_workflow_states,
      [productId]: {
        ...currentState,
        current_stage_index: newStageIndex
      }
    };

    this.releaseService.update(releaseId, {
      product_workflow_states: updatedStates
    }).subscribe({
      next: (updatedRelease) => {
        this.release.set(updatedRelease);
        this.workflowData.set(this.generateWorkflowData(updatedRelease, this.workflow || undefined));
      },
      error: (err) => {
        console.error('Failed to advance stage:', err);
        this.error.set('Failed to advance workflow stage');
      }
    });
  }

  addAttachment(productId: string, stageIndex: number): void {
    // TODO: Implement file upload for stage attachments
    console.log('Add attachment for product', productId, 'stage', stageIndex);
  }

  editStageDate(productId: string, stageIndex: number): void {
    const release = this.release();
    if (!release) return;

    const releaseId = release.id || release._id;
    if (!releaseId) return;

    const currentState = release.product_workflow_states?.[productId];
    if (!currentState) return;

    // Prompt for new date
    const newDate = prompt('Enter new date (YYYY-MM-DD):', 
      currentState.stage_dates?.[stageIndex.toString()] || '');
    
    if (newDate) {
      const updatedStates = {
        ...release.product_workflow_states,
        [productId]: {
          ...currentState,
          stage_dates: {
            ...currentState.stage_dates,
            [stageIndex.toString()]: newDate
          }
        }
      };

      this.releaseService.update(releaseId, {
        product_workflow_states: updatedStates
      }).subscribe({
        next: (updatedRelease) => {
          this.release.set(updatedRelease);
          this.workflowData.set(this.generateWorkflowData(updatedRelease, this.workflow || undefined));
        },
        error: (err) => {
          console.error('Failed to update stage date:', err);
          this.error.set('Failed to update stage date');
        }
      });
    }
  }

  workflow: Workflow | null = null;
}
