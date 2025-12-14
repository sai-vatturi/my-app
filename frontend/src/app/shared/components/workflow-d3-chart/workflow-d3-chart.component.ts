import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef, ViewChild, ChangeDetectionStrategy, signal, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { Release } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowRenderer } from './d3/workflow-renderer';
import { WorkflowNode, StageClickEvent } from './d3/models';

@Component({
  selector: 'app-workflow-d3-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-d3-chart.component.html',
  styleUrls: ['./workflow-d3-chart.component.scss']
})
export class WorkflowD3ChartComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() release?: Release;
  @Input() workflow!: WorkflowTemplate;
  @Input() products?: Product[];
  @Input() productMap?: Map<string, string>;

  @Output() advanceStage = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() editStageDate = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() addAttachment = new EventEmitter<{ productId: string; stageOrder: number }>();
  @Output() productClicked = new EventEmitter<string>();
  @Output() stageClicked = new EventEmitter<StageClickEvent>();

  isLocked = signal(false);
  private renderer?: WorkflowRenderer;

  workflowData = computed(() => {
    // If release is provided, show release -> products -> stages (horizontal for stages)
    if (this.release && this.workflow) {
      const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
      const productNodes: WorkflowNode[] = [];

      this.release.products.forEach((product, idx) => {
        const productName = this.productMap?.get(product.product_id) || product.product_id;
        const workflowStates = product.workflow_states || {};

        const stageNodes: WorkflowNode[] = sortedStages.map(stage => {
          const state = workflowStates[stage.order.toString()] || null;
          let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

          if (state?.status) {
            status = 'completed';
          } else {
            // Find first incomplete stage
            const firstIncomplete = sortedStages.find(s => {
              const sState = workflowStates[s.order.toString()];
              return !sState || !sState.status;
            });
            if (firstIncomplete?.order === stage.order) {
              status = 'current';
            }
          }

          return {
            id: `product-${idx}-stage-${stage.order}`,
            label: stage.name,
            type: 'stage',
            status,
            deadline: state?.deadline,
            requiresAttachment: stage.requires_attachment,
            attachmentMandatory: stage.attachment_mandatory,
            hasAttachment: (state?.attachments && state.attachments.length > 0) || !!state?.attachment_id,
            productId: product.product_id,
            stageOrder: stage.order
          } as WorkflowNode;
        });

        productNodes.push({
          id: `product-${idx}`,
          label: productName,
          type: 'product',
          children: stageNodes,
          productId: product.product_id
        });
      });

      return {
        id: 'release',
        label: this.release.name,
        type: 'release',
        children: productNodes
      } as WorkflowNode;
    }

    // If only workflow is provided (for workflow management page), show workflow -> stages directly
    if (this.workflow && !this.release) {
      const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
      const stageNodes: WorkflowNode[] = sortedStages.map(stage => ({
        id: `stage-${stage.order}`,
        label: stage.name,
        type: 'stage',
        requiresAttachment: stage.requires_attachment,
        attachmentMandatory: stage.attachment_mandatory,
        hasAttachment: false, // No specific product context for workflow-only view
        productId: undefined, // No specific product context for workflow-only view
        stageOrder: stage.order
      }));

      return {
        id: 'workflow',
        label: this.workflow.name,
        type: 'release', // Using 'release' type for the root node in workflow-only view for consistency
        children: stageNodes  // Direct children, no intermediate "Stages" node
      } as WorkflowNode;
    }

    return null;
  });

  ngOnInit(): void {
    // Logic moved to AfterViewInit/changes where renderer exists
  }

  ngAfterViewInit(): void {
    if (this.chartContainer?.nativeElement) {
      this.renderer = new WorkflowRenderer(this.chartContainer.nativeElement);

      // Subscribe to renderer events
      this.renderer.onProductClick = (productId) => this.productClicked.emit(productId);
      this.renderer.onStageClick = (event) => this.stageClicked.emit(event);

      // Initial render if data exists
      if (this.workflowData()) {
        this.renderChart();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['release'] || changes['workflow'] || changes['productMap']) && this.workflowData()) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.renderer) {
      this.renderer.cleanup();
    }
  }

  renderChart(): void {
    const data = this.workflowData();
    if (!data || !this.renderer) return;

    this.renderer.render(
      data,
      this.release,
      this.workflow,
      this.productMap,
      this.isLocked()
    );
  }

  zoomIn(): void {
    this.renderer?.zoomIn();
  }

  zoomOut(): void {
    this.renderer?.zoomOut();
  }

  fitToScreen(): void {
    this.renderer?.fitToScreen();
  }

  toggleLock(): void {
    this.isLocked.update(v => !v);
    this.renderer?.setZoomLock(this.isLocked());
  }
}
