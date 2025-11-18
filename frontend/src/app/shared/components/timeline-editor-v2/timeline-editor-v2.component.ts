import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReleaseService } from '../../../core/services/release.service';
import { WorkflowTemplate, WorkflowStage } from '../../../core/models/workflow.model';
import { Release, ReleaseProduct } from '../../../core/models/release.model';
import { AlertComponent } from '../alert/alert.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-timeline-editor-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-editor-v2.component.html',
})
export class TimelineEditorV2Component {
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
      deadline_date: ['', [Validators.required, this.weekdayValidator.bind(this)]],
      deadline_time: ['18:00'], // Default 6 PM SGT
      product_id: ['']
    });
  }

  weekdayValidator(control: any): { [key: string]: any } | null {
    if (!control || !control.value) return null;
    const date = new Date(control.value);
    if (isNaN(date.getTime())) return null;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { weekend: true };
    }
    return null;
  }

  validateWeekday(event: any): void {
    const dateStr = event.target.value;
    if (dateStr) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        this.form.get('deadline_date')?.setErrors({ weekend: true });
        this.error.set('Weekends are not allowed. Please select a weekday.');
      } else {
        this.form.get('deadline_date')?.setErrors(null);
        this.error.set(null);
      }
    }
  }

  getMinDate(): string {
    // Return today's date as minimum
    return new Date().toISOString().split('T')[0];
  }

  selectStage(stageOrder: number): void {
    this.selectedStage.set(stageOrder);
    const firstProduct = this.products[0];
    if (firstProduct?.workflow_states) {
      const state = firstProduct.workflow_states[stageOrder.toString()];
      if (state?.deadline) {
        const deadline = new Date(state.deadline);
        const dateStr = deadline.toISOString().split('T')[0];
        const timeStr = deadline.toTimeString().slice(0, 5);
        this.form.patchValue({
          deadline_date: dateStr,
          deadline_time: timeStr
        });
      } else {
        // Calculate default from release date
        this.calculateDefaultDeadline(stageOrder);
      }
    } else {
      this.calculateDefaultDeadline(stageOrder);
    }
  }

  calculateDefaultDeadline(stageOrder: number): void {
    const stage = this.sortedStages().find(s => s.order === stageOrder);
    if (!stage || !this.release.release_date) return;

    const releaseDate = new Date(this.release.release_date);
    const daysBefore = stage.default_days_before_release || 0;
    
    // Calculate date excluding weekends (excluding Saturday and Sunday)
    let targetDate = new Date(releaseDate);
    let daysSubtracted = 0;
    
    while (daysSubtracted < daysBefore) {
      targetDate.setDate(targetDate.getDate() - 1);
      const dayOfWeek = targetDate.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysSubtracted += 1;
      }
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    this.form.patchValue({
      deadline_date: dateStr,
      deadline_time: '18:00'
    });
  }

  getStageDeadline(stageOrder: number, product?: ReleaseProduct): string | null {
    if (!product?.workflow_states) return null;
    const state = product.workflow_states[stageOrder.toString()];
    return state?.deadline || null;
  }

  onSubmit(): void {
    const stageOrder = this.selectedStage();
    if (!stageOrder) {
      this.error.set('Please select a stage');
      return;
    }

    if (this.form.invalid) {
      this.error.set('Please enter a valid date and time');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const dateStr = this.form.value.deadline_date;
    const timeStr = this.form.value.deadline_time;
    
    // Validate that the selected date is not a weekend
    const selectedDate = new Date(dateStr);
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      this.error.set('Deadline cannot be set on weekends. Please select a weekday.');
      this.submitting.set(false);
      return;
    }
    
    const deadline = new Date(`${dateStr}T${timeStr}:00`);

    // Update via release service with direct deadline
    this.releaseService.updateStageTimeline(
      this.release.id || this.release._id || '',
      stageOrder,
      undefined, // days_before_release
      this.applyToAll() ? undefined : this.form.value.product_id,
      deadline
    ).subscribe({
      next: (updatedRelease) => {
        // For now, we'll need to update the service to accept deadline directly
        // This is a placeholder - we'll update the service method
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOverdue(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  excludeWeekends(date: Date): Date {
    const result = new Date(date);
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() - 1);
    }
    return result;
  }
}

