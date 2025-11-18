import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WorkflowService } from '../../../core/services/workflow.service';
import { Workflow } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Workflows</h1>
        <app-button
          variant="primary"
          [routerLink]="'/workflows/create'"
          icon="plus">
          Create Workflow
        </app-button>
      </div>

      <app-loading-spinner *ngIf="loading()" />

      <app-alert
        *ngIf="error()"
        type="error"
        [message]="error()!" />

      <div class="grid gap-4" *ngIf="!loading() && !error()">
        <div
          *ngFor="let workflow of workflows()"
          class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900">{{ workflow.name }}</h3>
              <p class="text-gray-600 mt-1" *ngIf="workflow.description">{{ workflow.description }}</p>
              <div class="mt-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ workflow.stages?.length || 0 }} stages
                </span>
              </div>
            </div>
            <div class="flex space-x-2">
              <app-button
                variant="secondary"
                size="sm"
                [routerLink]="'/workflows/' + (workflow.id || workflow._id) + '/edit'">
                Edit
              </app-button>
              <app-button
                variant="danger"
                size="sm"
                (click)="deleteWorkflow(workflow)">
                Delete
              </app-button>
            </div>
          </div>
        </div>

        <div *ngIf="workflows().length === 0" class="text-center py-12">
          <p class="text-gray-500">No workflows found.</p>
          <app-button
            variant="primary"
            class="mt-4"
            [routerLink]="'/workflows/create'">
            Create your first workflow
          </app-button>
        </div>
      </div>
    </div>
  `
})
export class WorkflowListComponent implements OnInit {
  workflows = signal<Workflow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private workflowService: WorkflowService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.loading.set(true);
    this.error.set(null);

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

  deleteWorkflow(workflow: Workflow): void {
    if (confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      const id = workflow.id || workflow._id;
      if (id) {
        this.workflowService.delete(id).subscribe({
          next: () => {
            // Workflow deleted successfully
          },
          error: (err) => {
            this.error.set(err.message || 'Failed to delete workflow');
          }
        });
      }
    }
  }
}
