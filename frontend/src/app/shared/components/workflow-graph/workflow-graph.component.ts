import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowTemplate, WorkflowStage } from '../../../core/models/workflow.model';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';

interface StageNode {
  stage: WorkflowStage;
  state: any;
  status: 'completed' | 'current' | 'upcoming';
  deadline?: string;
}

interface ProductNode {
  product: ReleaseProduct;
  productName: string;
  stages: StageNode[];
}

@Component({
  selector: 'app-workflow-graph',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-graph.component.html',
})
export class WorkflowGraphComponent {
  @Input() release?: Release;
  @Input() workflow!: WorkflowTemplate;
  @Input() products?: Product[];
  @Input() productMap?: Map<string, string>;
  @Output() releaseUpdated = new EventEmitter<Release>();

  productNodes = computed(() => {
    if (!this.release || !this.workflow) return [];
    
    const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
    const productMap = this.productMap || new Map();
    
    return this.release.products.map(product => {
      const workflowStates = product.workflow_states || {};
      const stages: StageNode[] = sortedStages.map(stage => {
        const state = workflowStates[stage.order.toString()] || null;
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        
        if (state?.status) {
          status = 'completed';
        } else {
          // Find first incomplete stage
          const allStages = sortedStages;
          const firstIncomplete = allStages.find(s => {
            const sState = workflowStates[s.order.toString()];
            return !sState || !sState.status;
          });
          if (firstIncomplete?.order === stage.order) {
            status = 'current';
          }
        }
        
        return {
          stage,
          state,
          status,
          deadline: state?.deadline
        };
      });
      
      return {
        product,
        productName: productMap.get(product.product_id) || product.product_id,
        stages
      } as ProductNode;
    });
  });

  getStageClass(node: StageNode): string {
    const baseClasses = 'flex flex-col items-center justify-center min-w-[120px] p-3 rounded-lg border-2 transition-all';
    
    if (node.status === 'completed') {
      return `${baseClasses} bg-green-50 border-green-300 text-green-900`;
    } else if (node.status === 'current') {
      return `${baseClasses} bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-200`;
    } else {
      return `${baseClasses} bg-gray-50 border-gray-200 text-gray-600`;
    }
  }

  getStatusIcon(node: StageNode): string {
    if (node.status === 'completed') {
      return '✓';
    } else if (node.status === 'current') {
      return '→';
    }
    return '○';
  }

  formatDeadline(deadline?: string): string {
    if (!deadline) return '';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isOverdue(deadline?: string): boolean {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate < now;
  }
}

