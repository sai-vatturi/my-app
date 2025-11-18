import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { WorkflowService } from '../../../core/services/workflow.service';
import { WorkflowTemplate, WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowStage } from '../../../core/models/workflow.model';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-editor.component.html',
})
export class WorkflowEditorComponent implements OnInit, OnChanges {
  @Input() workflow: WorkflowTemplate | null = null;
  @Output() saved = new EventEmitter<WorkflowTemplate>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      release_type: ['', Validators.required],
      stages: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadWorkflow();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workflow'] && !changes['workflow'].firstChange) {
      this.loadWorkflow();
    }
  }

  loadWorkflow(): void {
    if (this.workflow) {
      this.form.patchValue({
        name: this.workflow.name,
        release_type: this.workflow.release_type
      });
      
      // Clear existing stages
      while (this.stages.length !== 0) {
        this.stages.removeAt(0);
      }
      
      // Add existing stages
      this.workflow.stages.sort((a, b) => a.order - b.order).forEach(stage => {
        this.addStage(stage);
      });
    } else {
      // Clear form for new workflow
      this.form.patchValue({
        name: '',
        release_type: ''
      });
      while (this.stages.length !== 0) {
        this.stages.removeAt(0);
      }
    }
  }

  get stages(): FormArray {
    return this.form.get('stages') as FormArray;
  }

  addStage(stage?: WorkflowStage): void {
    const stageGroup = this.fb.group({
      name: [stage?.name || '', Validators.required],
      order: [stage?.order || this.stages.length + 1, [Validators.required, Validators.min(1)]],
      description: [stage?.description || ''],
      requires_attachment: [stage?.requires_attachment || false],
      attachment_mandatory: [stage?.attachment_mandatory || false],
      default_days_before_release: [stage?.default_days_before_release || 0, [Validators.required, Validators.min(0)]]
    });
    this.stages.push(stageGroup);
    this.updateStageOrders();
  }

  removeStage(index: number): void {
    this.stages.removeAt(index);
    this.updateStageOrders();
  }

  updateStageOrders(): void {
    this.stages.controls.forEach((control, index) => {
      control.patchValue({ order: index + 1 }, { emitEvent: false });
    });
  }

  moveStageUp(index: number): void {
    if (index === 0) return;
    const stages = this.stages;
    const temp = stages.at(index);
    stages.removeAt(index);
    stages.insert(index - 1, temp);
    this.updateStageOrders();
  }

  moveStageDown(index: number): void {
    if (index === this.stages.length - 1) return;
    const stages = this.stages;
    const temp = stages.at(index);
    stages.removeAt(index);
    stages.insert(index + 1, temp);
    this.updateStageOrders();
  }

  onSubmit(): void {
    if (this.form.invalid || this.stages.length === 0) {
      this.error.set('Please fill in all required fields and add at least one stage');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const workflowData = {
      name: formValue.name,
      release_type: formValue.release_type,
      stages: formValue.stages.map((s: any) => ({
        name: s.name,
        order: s.order,
        description: s.description || undefined,
        requires_attachment: s.requires_attachment,
        attachment_mandatory: s.attachment_mandatory,
        default_days_before_release: s.default_days_before_release
      }))
    };

    const request$ = this.workflow
      ? this.workflowService.update(this.workflow.id || this.workflow._id || '', workflowData as WorkflowTemplateUpdate)
      : this.workflowService.create(workflowData as WorkflowTemplateCreate);

    request$.subscribe({
      next: (workflow) => {
        this.submitting.set(false);
        this.saved.emit(workflow);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.message || 'Failed to save workflow');
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}

