import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReleaseService } from '../../../core/services/release.service';
import { WorkflowTemplate, WorkflowStage } from '../../../core/models/workflow.model';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { AlertComponent } from '../alert/alert.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-timeline-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-editor.component.html',
})
export class TimelineEditorComponent {
  @Input() release!: Release;
  @Input() workflow!: WorkflowTemplate;
  @Input() products!: ReleaseProduct[];
  @Input() productMap?: Map<string, string>;
  @Output() releaseUpdated = new EventEmitter<Release>();

  form: FormGroup;
  submitting = signal(false);
  error = signal<string | null>(null);
  selectedStage = signal<number | null>(null);
  applyToAll = signal(true);

  sortedStages = computed(() => {
    if (!this.workflow) return [];
    return [...this.workflow.stages].sort((a, b) => a.order - b.order);
  });

  selectedStageName = computed(() => {
    const stageOrder = this.selectedStage();
    if (!stageOrder) return '';
    const stage = this.sortedStages().find(s => s.order === stageOrder);
    return stage?.name || '';
  });

  constructor(
    private fb: FormBuilder,
    private releaseService: ReleaseService
  ) {
    this.form = this.fb.group({
      days_before_release: [0, [Validators.required, Validators.min(0)]],
      product_id: ['']
    });
  }

  selectStage(stageOrder: number): void {
    this.selectedStage.set(stageOrder);
    const stage = this.sortedStages().find(s => s.order === stageOrder);
    if (stage) {
      // Calculate days before release from deadline if available, otherwise use default
      const firstProduct = this.products[0];
      let daysBefore = stage.default_days_before_release;
      
      if (firstProduct?.workflow_states) {
        const state = firstProduct.workflow_states[stageOrder.toString()];
        if (state?.deadline && this.release?.release_date) {
          // Calculate days between deadline and release date
          const deadlineDate = new Date(state.deadline);
          const releaseDate = new Date(this.release.release_date);
          const diffTime = releaseDate.getTime() - deadlineDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            daysBefore = diffDays;
          }
        }
      }
      
      this.form.patchValue({
        days_before_release: daysBefore
      });
    }
  }

  getStageDeadline(stageOrder: number, product?: ReleaseProduct): string | null {
    if (!product?.workflow_states) return null;
    const state = product.workflow_states[stageOrder.toString()];
    return state?.deadline || null;
  }

  getStageDaysBefore(stageOrder: number, product?: ReleaseProduct): number | null {
    if (!product?.workflow_states || !this.release?.release_date) return null;
    const state = product.workflow_states[stageOrder.toString()];
    if (!state?.deadline) return null;
    
    // Calculate days before release from deadline
    const deadlineDate = new Date(state.deadline);
    const releaseDate = new Date(this.release.release_date);
    const diffTime = releaseDate.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }

  onSubmit(): void {
    const stageOrder = this.selectedStage();
    if (!stageOrder) {
      this.error.set('Please select a stage');
      return;
    }

    if (this.form.invalid) {
      this.error.set('Please enter a valid number of days');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const daysBefore = this.form.value.days_before_release;
    const productId = this.applyToAll() ? undefined : this.form.value.product_id;

    this.releaseService.updateStageTimeline(
      this.release.id || this.release._id || '',
      stageOrder,
      daysBefore,
      productId
    ).subscribe({
      next: (updatedRelease) => {
        this.submitting.set(false);
        this.releaseUpdated.emit(updatedRelease);
        this.selectedStage.set(null);
        this.form.reset();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.message || 'Failed to update timeline');
      }
    });
  }

  formatDeadline(deadline: string | null): string {
    if (!deadline) return 'Not set';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isOverdue(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }
}

