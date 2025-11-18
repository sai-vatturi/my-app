import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowTemplate, WorkflowStage, WorkflowStageState } from '../../../core/models/workflow.model';
import { ReleaseProduct, Release } from '../../../core/models/release.model';
import { ReleaseService } from '../../../core/services/release.service';
import { AlertComponent } from '../alert/alert.component';
import { environment } from '../../../../environments/environment';

interface StageDisplay {
  stage: WorkflowStage;
  state: WorkflowStageState | null;
  status: 'completed' | 'current' | 'upcoming';
  canAdvance: boolean;
}

@Component({
  selector: 'app-workflow-progress',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-progress.component.html',
})
export class WorkflowProgressComponent {
  @Input() workflow!: WorkflowTemplate;
  @Input() product!: ReleaseProduct;
  @Input() releaseId!: string;
  @Input() productId!: string;
  @Output() releaseUpdated = new EventEmitter<Release>();

  processing = signal(false);
  error = signal<string | null>(null);

  stages = computed(() => {
    if (!this.workflow || !this.product) return [];
    
    const workflowStates = this.product.workflow_states || {};
    const sortedStages = [...this.workflow.stages].sort((a, b) => a.order - b.order);
    
    let foundCurrent = false;
    
    return sortedStages.map((stage, index) => {
      const state = workflowStates[stage.order.toString()] || null;
      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      let canAdvance = false;
      
      if (state?.status) {
        status = 'completed';
      } else if (!foundCurrent) {
        status = 'current';
        foundCurrent = true;
        
        // Can advance if:
        // 1. No attachment required, OR
        // 2. Attachment required but not mandatory, OR
        // 3. Attachment required and mandatory and attachment exists
        if (!stage.requires_attachment) {
          canAdvance = true;
        } else if (stage.requires_attachment && !stage.attachment_mandatory) {
          canAdvance = true;
        } else if (stage.requires_attachment && stage.attachment_mandatory && state?.attachment_id) {
          canAdvance = true;
        }
      }
      
      return {
        stage,
        state,
        status,
        canAdvance
      } as StageDisplay;
    });
  });

  constructor(private releaseService: ReleaseService) {}

  advanceStage(): void {
    if (this.processing()) return;
    
    this.processing.set(true);
    this.error.set(null);
    
    this.releaseService.advanceProductStage(this.releaseId, this.productId).subscribe({
      next: (updatedRelease) => {
        this.processing.set(false);
        this.releaseUpdated.emit(updatedRelease);
      },
      error: (err) => {
        this.processing.set(false);
        this.error.set(err.message || 'Failed to advance stage');
      }
    });
  }

  uploadAttachment(stageOrder: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    this.processing.set(true);
    this.error.set(null);
    
    this.releaseService.uploadStageAttachment(this.releaseId, this.productId, stageOrder, file).subscribe({
      next: (updatedRelease) => {
        this.processing.set(false);
        this.releaseUpdated.emit(updatedRelease);
        // Reset file input
        input.value = '';
      },
      error: (err) => {
        this.processing.set(false);
        this.error.set(err.message || 'Failed to upload attachment');
      }
    });
  }

  downloadAttachment(attachmentId: string): void {
    const baseUrl = environment.apiUrl;
    window.open(`${baseUrl}/files/${attachmentId}/download`, '_blank');
  }

  getStageClass(stage: StageDisplay): string {
    const baseClasses = 'flex items-center gap-3 p-4 rounded-lg border-2 transition-all';
    
    if (stage.status === 'completed') {
      return `${baseClasses} bg-green-50 border-green-200 text-green-900`;
    } else if (stage.status === 'current') {
      return `${baseClasses} bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-200`;
    } else {
      return `${baseClasses} bg-gray-50 border-gray-200 text-gray-600`;
    }
  }

  getStatusIcon(stage: StageDisplay): string {
    if (stage.status === 'completed') {
      return '✓';
    } else if (stage.status === 'current') {
      return '→';
    }
    return '○';
  }
}

