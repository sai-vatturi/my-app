import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { ReleaseCreate, ReleaseUpdate, ReleaseType } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-release-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-form.component.html',
})
export class ReleaseFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  releaseId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  availableProducts = signal<Product[]>([]);
  availableWorkflows = signal<WorkflowTemplate[]>([]);
  releaseTypes = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private releaseService: ReleaseService,
    private productService: ProductService,
    private workflowService: WorkflowService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      release_type: [ReleaseType.MAJOR_RELEASE, Validators.required],
      status: ['planned'],
      release_date: ['', Validators.required],
      chg_number: [''],
      jira_release_version: [''],
      overall_scope: ['']
    });
  }

  ngOnInit(): void {
    this.loadWorkflows();
    this.releaseId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.releaseId;
    if (this.isEdit && this.releaseId) this.loadRelease(this.releaseId);
  }

  loadWorkflows(): void {
    this.workflowService.getAll().subscribe({
      next: (workflows) => {
        this.availableWorkflows.set(workflows);
        const types = workflows.map(w => w.release_type);
        this.releaseTypes.set(types);
        // Set default if form is empty
        if (!this.isEdit && types.length > 0 && !this.form.get('release_type')?.value) {
          this.form.patchValue({ release_type: types[0] });
        }
      },
      error: (err) => {
        console.error('Failed to load workflows:', err);
        // Fallback to enum values if workflow service fails
        this.releaseTypes.set(Object.values(ReleaseType));
      }
    });
  }

  loadRelease(id: string): void {
    this.loading.set(true);
    this.releaseService.getById(id).subscribe({
      next: (release) => {
        const releaseDate = new Date(release.release_date);
        const formattedDate = releaseDate.toISOString().slice(0, 16);

        this.form.patchValue({
          name: release.name,
          description: release.description || '',
          release_type: release.release_type,
          status: release.status,
          release_date: formattedDate,
          chg_number: release.chg_number || '',
          jira_release_version: release.jira_release_version || '',
          overall_scope: release.overall_scope || ''
        });

        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load release'); }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const data = { ...formValue };

    if (this.isEdit && this.releaseId) {
      this.releaseService.update(this.releaseId, data as ReleaseUpdate).subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigate(['/releases', this.releaseId]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to save release');
        }
      });
    } else {
      this.releaseService.create(data as ReleaseCreate).subscribe({
        next: (createdRelease) => {
          this.submitting.set(false);
          const id = createdRelease.id || createdRelease._id;
          this.router.navigate(['/releases', id]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to save release');
        }
      });
    }
  }

  cancel(): void {
    if (this.isEdit && this.releaseId) {
      this.router.navigate(['/releases', this.releaseId]);
    } else {
      this.router.navigate(['/releases']);
    }
  }
}
