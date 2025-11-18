import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkflowService } from '../../../core/services/workflow.service';
import { Workflow, WorkflowCreate, WorkflowUpdate, WorkflowStage } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-workflow-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEdit ? 'Edit Workflow' : 'Create Workflow' }}
        </h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Basic Info -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Workflow Details</h2>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                formControlName="name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Major Release Workflow">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                formControlName="description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe this workflow..."></textarea>
            </div>
          </div>
        </div>

        <!-- Stages -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Workflow Stages</h2>
            <app-button
              type="button"
              variant="secondary"
              size="sm"
              (click)="addStage()">
              Add Stage
            </app-button>
          </div>

          <div formArrayName="stages" class="space-y-4">
            <div
              *ngFor="let stage of stages.controls; let i = index"
              [formGroupName]="i"
              class="border border-gray-200 rounded-lg p-4">

              <div class="flex justify-between items-start mb-4">
                <h3 class="text-md font-medium text-gray-900">Stage {{ i + 1 }}</h3>
                <button
                  type="button"
                  (click)="removeStage(i)"
                  class="text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Stage Name *</label>
                  <input
                    type="text"
                    formControlName="name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Days Before Release *</label>
                  <input
                    type="number"
                    formControlName="default_days_before_release"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0">
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    formControlName="description"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>

                <div class="flex items-center space-x-4">
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      formControlName="requires_attachment"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Requires Attachment</span>
                  </label>

                  <label class="flex items-center" *ngIf="stage.get('requires_attachment')?.value">
                    <input
                      type="checkbox"
                      formControlName="attachment_mandatory"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <span class="ml-2 text-sm text-gray-700">Attachment Mandatory</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="stages.length === 0" class="text-center py-8 text-gray-500">
            No stages added yet. Click "Add Stage" to get started.
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-4">
          <app-button
            type="button"
            variant="secondary"
            (click)="cancel()">
            Cancel
          </app-button>
          <app-button
            type="submit"
            variant="primary"
            [disabled]="submitting()">
            {{ isEdit ? 'Update Workflow' : 'Create Workflow' }}
          </app-button>
        </div>
      </form>

      <app-loading-spinner *ngIf="loading()" />
      <app-alert *ngIf="error()" type="error" [message]="error()!" />
    </div>
  `
})
export class WorkflowFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  workflowId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      stages: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.workflowId;

    if (this.isEdit && this.workflowId) {
      this.loadWorkflow(this.workflowId);
    }
  }

  get stages(): FormArray {
    return this.form.get('stages') as FormArray;
  }

  createStageFormGroup(stage?: WorkflowStage): FormGroup {
    return this.fb.group({
      name: [stage?.name || '', Validators.required],
      description: [stage?.description || ''],
      requires_attachment: [stage?.requires_attachment || false],
      attachment_mandatory: [stage?.attachment_mandatory || false],
      default_days_before_release: [stage?.default_days_before_release || 0, [Validators.required, Validators.min(0)]]
    });
  }

  addStage(): void {
    this.stages.push(this.createStageFormGroup());
  }

  removeStage(index: number): void {
    this.stages.removeAt(index);
  }

  loadWorkflow(id: string): void {
    this.loading.set(true);
    this.workflowService.getById(id).subscribe({
      next: (workflow) => {
        this.form.patchValue({
          name: workflow.name,
          description: workflow.description
        });

        // Clear existing stages and add loaded ones
        while (this.stages.length > 0) {
          this.stages.removeAt(0);
        }

        workflow.stages?.forEach(stage => {
          this.stages.push(this.createStageFormGroup(stage));
        });

        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load workflow');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    // Sort stages by default_days_before_release (descending - later stages first)
    const sortedStages = [...formValue.stages].sort((a: any, b: any) =>
      b.default_days_before_release - a.default_days_before_release
    );

    // Assign order based on sorted position
    sortedStages.forEach((stage: any, index: number) => {
      stage.order = index;
    });

    const workflowData = {
      name: formValue.name,
      description: formValue.description,
      stages: sortedStages
    };

    const operation = this.isEdit && this.workflowId
      ? this.workflowService.update(this.workflowId, workflowData)
      : this.workflowService.create(workflowData);

    operation.subscribe({
      next: () => {
        this.router.navigate(['/workflows']);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to save workflow');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/workflows']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
}
