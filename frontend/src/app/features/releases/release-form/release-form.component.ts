import { Component, OnInit, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { ReleaseCreate, ReleaseUpdate, ReleaseType, ReleaseProduct } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
import { WorkflowTemplate } from '../../../core/models/workflow.model';
import { BusinessUnit } from '../../../core/models/business-unit.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TimelineEditorComponent, TimelineUpdateEvent } from '../../../shared/components/timeline-editor/timeline-editor.component';
import { ReleaseProductsTableComponent } from '../release-products-table/release-products-table';
import { ProductEditDialogComponent, ProductDialogData } from '../product-edit-dialog/product-edit-dialog';
import { catchError, map, of, switchMap, finalize } from 'rxjs';

@Component({
  selector: 'app-release-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent, TimelineEditorComponent, ReleaseProductsTableComponent, ProductEditDialogComponent],
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

  // State for dialogs
  editingProductIndex = signal<number | null>(null);
  editingProduct = signal<ProductDialogData | null>(null);
  addingProduct = signal<boolean>(false);
  newProductData = signal<ProductDialogData | null>(null);

  releaseId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  allProducts = signal<Product[]>([]); // Full list of products
  availableProducts = computed(() => { // Filtered by Business Unit
    const buId = this.currentBusinessUnitId();
    if (!buId) return [];
    return this.allProducts().filter(p => p.business_unit_id === buId);
  });
  currentBusinessUnitId = signal<string>('');
  availableWorkflows = signal<WorkflowTemplate[]>([]);
  businessUnits = signal<BusinessUnit[]>([]);
  releaseTypes = signal<string[]>([]);
  loadingBusinessUnits = signal(false);

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
    private businessUnitService: BusinessUnitService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      business_unit_id: ['', Validators.required],
      release_type: [ReleaseType.MAJOR_RELEASE, Validators.required],
      release_date_day: ['', Validators.required],
      release_date_time: ['00:00', Validators.required],
      chg_number: [''],
      overall_scope: ['']
    });

    // Track Business Unit changes to filter products
    this.form.get('business_unit_id')?.valueChanges.subscribe(value => {
      this.currentBusinessUnitId.set(value);
    });
  }

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadBusinessUnits();
    this.releaseId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.releaseId;
    if (this.isEdit) {
      this.form.get('business_unit_id')?.disable();
      if (this.releaseId) this.loadRelease(this.releaseId);
    }
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe(products => {
      this.allProducts.set(products);
      // Initialize current BU if form has value
      const currentBu = this.form.get('business_unit_id')?.value;
      if (currentBu) this.currentBusinessUnitId.set(currentBu);

      products.forEach(p => {
        const id = p.id || p._id;
        if (id) this.productMap.set(id, p.name);
      });
    });
  }

  loadBusinessUnits(): void {
    this.loadingBusinessUnits.set(true);
    this.businessUnitService.getAll().subscribe({
      next: (units) => {
        this.businessUnits.set(units);
        this.loadingBusinessUnits.set(false);
      },
      error: () => {
        this.loadingBusinessUnits.set(false);
      }
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
        releaseDate.setSeconds(0, 0); // Force seconds to 00
        // Remove formattedDate assignment to avoid unused var if we inline it

        this.form.patchValue({
          name: release.name,
          description: release.description || '',
          business_unit_id: release.business_unit_id || '',
          release_type: release.release_type,
          status: release.status,
          release_date_day: releaseDate.toISOString().split('T')[0],
          release_date_time: releaseDate.toTimeString().slice(0, 5),
          chg_number: release.chg_number || '',
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
      if (!this.createdRelease()?.workflow_states || Object.keys(this.createdRelease()!.workflow_states).length === 0) {
        this.calculateDefaultWorkflowStates();
      }
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

    const name = this.form.get('name')?.value;
    const isNameChanged = !this.isEdit || (this.createdRelease()?.name !== name);

    if (isNameChanged) {
      this.submitting.set(true);
      this.releaseService.getById(name).pipe(
        map(() => true), // Exists
        catchError(() => of(false)), // 404 - Unique
        finalize(() => this.submitting.set(false))
      ).subscribe(exists => {
        if (exists) {
          this.error.set('A release with this name already exists.');
        } else {
          this.proceedToStep2();
        }
      });
    } else {
      this.proceedToStep2();
    }
  }

  proceedToStep2(): void {
    const formValue = this.form.value;
    const releaseDate = this.getReleaseDateFromForm();
    const releaseData = {
      ...formValue,
      release_date: releaseDate
    };
    // Update local state without API call
    if (this.createdRelease()) {
      this.createdRelease.update((prev: any) => ({ ...prev, ...releaseData }));
    } else {
      this.createdRelease.set({ ...releaseData, products: [], workflow_states: {} });
    }
    this.currentStep.set(2);
    this.error.set(null);
  }

  getReleaseDateFromForm(): string {
    const day = this.form.get('release_date_day')?.value;
    const time = this.form.get('release_date_time')?.value;
    if (!day || !time) return '';
    return `${day}T${time}:00`;
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
    // Finalize creation or update
    this.submitting.set(true);

    // Construct payload
    const data = { ...this.createdRelease() };

    // Ensure products are up to date
    data.products = this.products();

    // Ensure dates are string iso
    if (data.release_date instanceof Date) {
      data.release_date = data.release_date.toISOString();
    }

    if (this.isEdit && this.releaseId) {
      this.releaseService.update(this.releaseId, data).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.router.navigate(['/releases', updated.name]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to update release');
        }
      });
    } else {
      this.releaseService.create(data).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.router.navigate(['/releases', created.name]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Failed to create release');
        }
      });
    }
  }

  cancel(): void {
    if (this.isEdit) {
      // Try to get name from createdRelease (loaded from DB)
      const name = this.createdRelease()?.name;
      if (name) {
        this.router.navigate(['/releases', name]);
      } else if (this.releaseId) {
        this.router.navigate(['/releases', this.releaseId]);
      } else {
        this.router.navigate(['/releases']);
      }
    } else {
      this.router.navigate(['/releases']);
    }
  }

  // Product Management Methods
  openAddProductDialog(): void {
    this.newProductData.set({
      product_id: '',
      new_features: '',
      enhancements: '',
      key_defect_fixes: '',
      deferred_items: '',
      fixed_versions: [],
      pocs: []
    });
    this.addingProduct.set(true);
  }

  closeAddProductDialog(): void {
    this.addingProduct.set(false);
    this.newProductData.set(null);
  }

  onSaveNewProduct(productData: ProductDialogData): void {
    if (!productData.product_id) return;

    const productToAdd = { ...productData };

    // If we have default states calculated, add them to the product
    if (this.createdRelease()?.workflow_states) {
      productToAdd.workflow_states = { ...this.createdRelease().workflow_states };
    }

    const currentProducts = this.products();
    this.products.set([...currentProducts, productToAdd]);
    this.closeAddProductDialog();
  }

  onTimelineUpdate(event: TimelineUpdateEvent): void {
    const deadlineStr = event.deadline.toISOString();
    const stageOrder = event.stageOrder.toString();

    // Clone release state
    const currentRelease = { ...this.createdRelease() };
    if (!currentRelease.workflow_states) currentRelease.workflow_states = {};

    let currentProducts = [...this.products()];

    if (event.productId) {
      // Product specific update
      const pIndex = currentProducts.findIndex(p => (p.product_id || p.id || p._id) === event.productId);
      if (pIndex !== -1) {
        const product = { ...currentProducts[pIndex] };
        product.workflow_states = { ...(product.workflow_states || {}) };
        product.workflow_states[stageOrder] = { deadline: deadlineStr, status: false };
        currentProducts[pIndex] = product;
        this.products.set(currentProducts);
      }
    } else {
      // Release wide update - Apply to Release Default AND All Products
      currentRelease.workflow_states[stageOrder] = { deadline: deadlineStr, status: false };

      // Update all products
      currentProducts = currentProducts.map(p => {
        const product = { ...p };
        product.workflow_states = { ...(product.workflow_states || {}) };
        product.workflow_states[stageOrder] = { deadline: deadlineStr, status: false };
        return product;
      });

      this.products.set(currentProducts);
    }

    this.createdRelease.set(currentRelease);
  }

  onReleaseUpdated(updatedRelease: any): void {
    this.createdRelease.set(updatedRelease);
  }

  removeProduct(index: number): void {
    const currentProducts = [...this.products()];
    currentProducts.splice(index, 1);
    this.products.set(currentProducts);
  }

  editProduct(index: number): void {
    const product = this.products()[index];
    this.editingProduct.set({
      product_id: product.product_id,
      new_features: product.new_features || '',
      enhancements: product.enhancements || '',
      key_defect_fixes: product.key_defect_fixes || '',
      deferred_items: product.deferred_items || '',
      pocs: [...(product.pocs || [])],
      fixed_versions: (product.fixed_versions || []).map((v: any) => ({ ...v })),
      workflow_states: product.workflow_states,
    });
    this.editingProductIndex.set(index);
  }

  closeProductDialog(): void {
    this.editingProductIndex.set(null);
    this.editingProduct.set(null);
  }

  onSaveProduct(updatedProduct: ProductDialogData): void {
    const index = this.editingProductIndex();
    if (index === null) return;

    const currentProducts = [...this.products()];
    // Preserve workflow_states from original product
    const originalProduct = currentProducts[index];
    currentProducts[index] = {
      ...updatedProduct,
      workflow_states: originalProduct.workflow_states,
    };
    this.products.set(currentProducts);
    this.closeProductDialog();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }


  private calculateDefaultWorkflowStates(): void {
    const release = this.createdRelease();
    const workflow = this.selectedWorkflow();

    if (!release || !workflow || !release.release_date) return;

    const releaseDate = new Date(release.release_date);
    const states: any = {};

    workflow.stages.forEach(stage => {
      const daysBefore = stage.default_days_before_release || 0;
      const deadline = this.subtractBusinessDays(releaseDate, daysBefore);
      // Set to 18:00
      deadline.setHours(18, 0, 0, 0);

      states[stage.order.toString()] = {
        deadline: deadline.toISOString(),
        status: false
      };
    });

    this.createdRelease.update((prev: any) => ({ ...prev, workflow_states: states }));

    // Also update all existing products with these defaults
    const currentProducts = this.products().map(p => ({
      ...p,
      workflow_states: { ...states } // Copy defaults
    }));
    this.products.set(currentProducts);
  }

  private subtractBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let count = 0;
    while (count < days) {
      result.setDate(result.getDate() - 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
        count++;
      }
    }
    return result;
  }
}
