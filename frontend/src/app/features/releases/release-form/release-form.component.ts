import { Component, OnInit, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { ReleaseCreate, ReleaseUpdate, ReleaseType, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TimelineEditorV2Component } from '../../../shared/components/timeline-editor-v2/timeline-editor-v2.component';

@Component({
  selector: 'app-release-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent, TimelineEditorV2Component],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-form.component.html',
})
export class ReleaseFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  currentStep = signal(1); // 1: Info, 2: Products, 3: Timeline
  createdRelease = signal<ReleaseCreate | any>(null); // Track the release created in Step 1
  products = signal<any[]>([]); // Track products for Step 2
  productMap = new Map<string, string>();

  // State for modals
  editingProductIndex = signal<number | null>(null);
  addingProduct = signal<boolean>(false);

  newProduct: Partial<ReleaseProduct> & { product_id: string; scope_description: string; fixed_versions: any[]; pocs: string[] } = {
    product_id: '',
    scope_description: '',
    fixed_versions: [],
    pocs: []
  };

  releaseId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  availableProducts = signal<Product[]>([]);
  availableWorkflows = signal<WorkflowTemplate[]>([]);
  releaseTypes = signal<string[]>([]);

  selectedWorkflow = computed(() => {
    const type = this.createdRelease()?.release_type || this.form.get('release_type')?.value;
    if (!type) return undefined;
    return this.availableWorkflows().find(w => w.release_type === type);
  });

  unselectedProducts = computed(() => {
    const currentProductIds = new Set(this.products().map(p => p.product_id));
    return this.availableProducts().filter(p => !currentProductIds.has(p.id || p._id));
  });

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
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe(products => {
      this.availableProducts.set(products);
      products.forEach(p => {
        const id = p.id || p._id;
        if (id) this.productMap.set(id, p.name);
      });
    });
  }

  getProductName(productId: string): string {
    return this.productMap.get(productId) || productId;
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

        this.createdRelease.set(release);

        if (release.products) {
          this.products.set(release.products);
        }

        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load release'); }
    });
  }

  onSubmit(): void {
    if (this.currentStep() === 1) {
      this.handleStep1Submit();
    } else if (this.currentStep() === 2) {
      this.currentStep.set(3);
    } else {
      // Step 3 (Timeline) - Finalize
      this.finish();
    }
  }

  handleStep1Submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const data = { ...formValue };

    if (this.isEdit && this.releaseId) {
      // Existing release update
      this.releaseService.update(this.releaseId, data as ReleaseUpdate).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.createdRelease.set(updated);
          this.currentStep.set(2);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to update release');
        }
      });
    } else {
      // New release creation
      this.releaseService.create(data as ReleaseCreate).subscribe({
        next: (createdRelease) => {
          this.submitting.set(false);
          this.createdRelease.set(createdRelease);
          const id = createdRelease.id || createdRelease._id;
          if (id) {
            this.releaseId = id;
          }
          this.currentStep.set(2);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to create release');
        }
      });
    }
  }

  nextStep(): void {
    if (this.currentStep() < 3) {
      this.currentStep.update(v => v + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(v => v - 1);
    }
  }

  finish(): void {
    if (this.releaseId) {
      this.router.navigate(['/releases', this.releaseId]);
    }
  }

  cancel(): void {
    if (this.isEdit && this.releaseId) {
      this.router.navigate(['/releases', this.releaseId]);
    } else {
      this.router.navigate(['/releases']);
    }
  }

  // Product Management Methods
  openAddProductDialog(): void {
    this.newProduct = {
      product_id: '',
      scope_description: '',
      fixed_versions: [],
      pocs: []
    };
    this.addingProduct.set(true);
  }

  closeAddProductDialog(): void {
    this.addingProduct.set(false);
  }

  saveNewProduct(): void {
    if (!this.newProduct.product_id) return;

    if (!this.releaseId) return;

    // Get current products from signal or source of truth
    const currentProducts = this.products();
    const updatedProducts = [...currentProducts, this.newProduct];

    this.releaseService.update(this.releaseId, { products: updatedProducts }).subscribe({
      next: (updated) => {
        this.createdRelease.set(updated);
        this.products.set(updated.products || []);
        this.closeAddProductDialog();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to add product');
      }
    });
  }

  onReleaseUpdated(updatedRelease: any): void {
    // Update the signal with the fresh release data from the timeline editor
    this.createdRelease.set(updatedRelease);
    if (updatedRelease.products) {
      this.products.set(updatedRelease.products);
    }
  }

  removeProduct(index: number): void {
    if (!this.releaseId) return;

    const currentProducts = [...this.products()];
    currentProducts.splice(index, 1);

    this.releaseService.update(this.releaseId, { products: currentProducts }).subscribe({
      next: (updated) => {
        this.createdRelease.set(updated);
        this.products.set(updated.products || []);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to remove product');
      }
    });
  }

  // Helper for new product form
  addNewProductPoc(): void {
    this.newProduct.pocs.push('');
  }

  removeNewProductPoc(index: number): void {
    this.newProduct.pocs.splice(index, 1);
  }

  updateNewProductPoc(value: string, index: number): void {
    const updatedPocs = [...this.newProduct.pocs];
    updatedPocs[index] = value;
    this.newProduct.pocs = updatedPocs;
  }

  addNewProductVersion(): void {
    this.newProduct.fixed_versions.push({ jira_board_id: '', fixed_version: '' });
  }

  removeNewProductVersion(index: number): void {
    this.newProduct.fixed_versions.splice(index, 1);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
