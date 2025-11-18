import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../core/services/workflow.service';
import { WorkflowTemplate, WorkflowStage } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { WorkflowEditorComponent } from '../workflow-editor/workflow-editor.component';
import { WorkflowD3ChartComponent } from '../../../shared/components/workflow-d3-chart/workflow-d3-chart.component';
import { Release } from '../../../core/models/release.model';

@Component({
  selector: 'app-workflow-management',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, AlertComponent, WorkflowEditorComponent, WorkflowD3ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-management.component.html',
})
export class WorkflowManagementComponent implements OnInit {
  workflows = signal<WorkflowTemplate[]>([]);
  selectedWorkflow = signal<WorkflowTemplate | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  showCreateForm = signal(false);
  editingWorkflow = signal<WorkflowTemplate | null>(null);
  emptyProductMap = new Map<string, string>();

  defaultWorkflows = computed(() => this.workflows().filter(w => w.is_default));
  customWorkflows = computed(() => this.workflows().filter(w => !w.is_default));
  sortedStages = computed(() => {
    const workflow = this.selectedWorkflow();
    if (!workflow) return [];
    return [...workflow.stages].sort((a, b) => a.order - b.order);
  });

  constructor(private workflowService: WorkflowService) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.loading.set(true);
    this.workflowService.getAll().subscribe({
      next: (workflows) => {
        this.workflows.set(workflows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load workflows');
        this.loading.set(false);
      }
    });
  }

  selectWorkflow(workflow: WorkflowTemplate): void {
    this.selectedWorkflow.set(workflow);
    this.showCreateForm.set(false);
  }

  createNewWorkflow(): void {
    this.showCreateForm.set(true);
    this.selectedWorkflow.set(null);
  }

  editWorkflow(workflow: WorkflowTemplate): void {
    this.editingWorkflow.set(workflow);
    this.showCreateForm.set(true);
    this.selectedWorkflow.set(null);
  }

  deleteWorkflow(workflow: WorkflowTemplate): void {
    if (!confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      return;
    }
    
    const workflowId = workflow.id || workflow._id;
    if (!workflowId) return;

    this.loading.set(true);
    this.workflowService.delete(workflowId).subscribe({
      next: () => {
        this.loadWorkflows();
        this.selectedWorkflow.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to delete workflow');
        this.loading.set(false);
      }
    });
  }

  onWorkflowSaved(workflow: WorkflowTemplate): void {
    this.loadWorkflows();
    this.showCreateForm.set(false);
    this.editingWorkflow.set(null);
    this.selectedWorkflow.set(workflow);
  }

  onWorkflowCancelled(): void {
    this.showCreateForm.set(false);
    this.editingWorkflow.set(null);
  }

  onWorkflowUpdated(): void {
    this.loadWorkflows();
  }

  onWorkflowDeleted(): void {
    this.loadWorkflows();
    this.selectedWorkflow.set(null);
  }
}

