import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardComponent, CardBodyComponent, CardHeaderComponent } from '../../../components/ui/card/card.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { ReleaseApiService } from '../../../lib/api/release-api.service';
import { ProductApiService } from '../../../lib/api/product-api.service';
import { Product } from '../../../lib/models/product.model';
import { ProductScope, ReleaseUpdateDto, Release } from '../../../lib/models/release.model';

@Component({
  selector: 'app-edit-release',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardBodyComponent,
    ButtonComponent
  ],
  templateUrl: './edit-release.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditReleaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly releaseApi = inject(ReleaseApiService);
  private readonly productApi = inject(ProductApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly products = signal<Product[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly loadingRelease = signal(true);
  protected readonly release = signal<Release | null>(null);

  protected readonly releaseTypes = ['Major release', 'Hotfix', 'Data patch', 'Hotfix & Data patch'];

  protected readonly releaseForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    release_date: ['', Validators.required],
    start_date: [{ value: '', disabled: true }],
    status: ['planned'],
    jira_release_version: [''],
    chg_number: [''],
    participating_products: [[] as string[], Validators.required],
    release_type: ['', Validators.required],
    product_scopes: this.fb.array([])
  });

  ngOnInit() {
    this.loadProducts();
    this.loadRelease();
    this.setupDateCalculation();
  }

  get productScopes() {
    return this.releaseForm.controls.product_scopes as FormArray;
  }

  loadProducts() {
    this.productApi.getAll({ limit: 100 }).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loadingProducts.set(false);
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.loadingProducts.set(false);
      }
    });
  }

  loadRelease() {
    const releaseId = this.route.snapshot.paramMap.get('id');
    if (!releaseId) {
      this.error.set('Release ID not found');
      this.loadingRelease.set(false);
      return;
    }

    this.releaseApi.getById(releaseId).subscribe({
      next: (release) => {
        this.release.set(release);
        this.populateForm(release);
        this.loadingRelease.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load release');
        this.loadingRelease.set(false);
      }
    });
  }

  populateForm(release: Release) {
    // Set basic fields
    this.releaseForm.patchValue({
      name: release.name,
      description: release.description || '',
      release_date: release.release_date.split('T')[0],
      status: release.status,
      jira_release_version: release.jira_release_version || '',
      chg_number: release.chg_number || '',
      release_type: release.release_type || '',
      participating_products: release.participating_products
    });

    // Populate product scopes
    release.product_scopes.forEach(scope => {
      const scopeGroup = this.fb.group({
        product_id: [scope.product_id],
        scope_description: [scope.scope_description || ''],
        pocs: this.fb.array(scope.pocs.map(poc => this.fb.control(poc))),
        fixed_versions: this.fb.array(
          scope.fixed_versions.map(fv => 
            this.fb.group({
              jira_board_id: [fv.jira_board_id],
              fixed_version: [fv.fixed_version]
            })
          )
        )
      });
      this.productScopes.push(scopeGroup);
    });
  }

  setupDateCalculation() {
    this.releaseForm.controls.release_date.valueChanges.subscribe(releaseDate => {
      if (releaseDate) {
        const date = new Date(releaseDate);
        date.setDate(date.getDate() - 30);
        this.releaseForm.controls.start_date.setValue(
          date.toISOString().split('T')[0]
        );
      }
    });
  }

  onProductChange(productId: string, checked: boolean) {
    const currentProducts = this.releaseForm.controls.participating_products.value;
    if (checked) {
      this.releaseForm.controls.participating_products.setValue([...currentProducts, productId]);
      // Add product scope form group with POCs and fixed_versions
      this.productScopes.push(this.fb.group({
        product_id: [productId],
        scope_description: [''],
        pocs: this.fb.array([]),
        fixed_versions: this.fb.array([])
      }));
    } else {
      this.releaseForm.controls.participating_products.setValue(
        currentProducts.filter(id => id !== productId)
      );
      // Remove product scope form group
      const index = this.productScopes.controls.findIndex(
        (control: any) => control.value.product_id === productId
      );
      if (index > -1) {
        this.productScopes.removeAt(index);
      }
    }
  }

  getProductScopeIndex(productId: string): number {
    return this.productScopes.controls.findIndex(
      (control: any) => control.value.product_id === productId
    );
  }

  getProductScope(productId: string) {
    const index = this.getProductScopeIndex(productId);
    return index >= 0 ? this.productScopes.at(index) : null;
  }

  getPocs(productId: string): FormArray {
    const scope = this.getProductScope(productId) as any;
    return scope?.get('pocs') as FormArray;
  }

  addPoc(productId: string) {
    const pocs = this.getPocs(productId);
    if (pocs) {
      pocs.push(this.fb.control(''));
    }
  }

  removePoc(productId: string, index: number) {
    const pocs = this.getPocs(productId);
    if (pocs) {
      pocs.removeAt(index);
    }
  }

  getFixedVersions(productId: string): FormArray {
    const scope = this.getProductScope(productId) as any;
    return scope?.get('fixed_versions') as FormArray;
  }

  addFixedVersion(productId: string) {
    const fixedVersions = this.getFixedVersions(productId);
    if (fixedVersions) {
      fixedVersions.push(this.fb.group({
        jira_board_id: [''],
        fixed_version: ['']
      }));
    }
  }

  removeFixedVersion(productId: string, index: number) {
    const fixedVersions = this.getFixedVersions(productId);
    if (fixedVersions) {
      fixedVersions.removeAt(index);
    }
  }

  isProductSelected(productId: string): boolean {
    return this.releaseForm.controls.participating_products.value.includes(productId);
  }

  onSubmit() {
    if (this.releaseForm.invalid) {
      Object.keys(this.releaseForm.controls).forEach(key => {
        const control = this.releaseForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const releaseId = this.route.snapshot.paramMap.get('id');
    if (!releaseId) {
      this.error.set('Release ID not found');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.releaseForm.getRawValue();
    
    // Build product scopes with POCs and manually entered fixed versions
    const productScopes: ProductScope[] = formValue.product_scopes.map((scope: any) => ({
      product_id: scope.product_id,
      scope_description: scope.scope_description || '',
      pocs: scope.pocs.filter((p: string) => p && p.trim() !== ''),
      fixed_versions: scope.fixed_versions
        .filter((fv: any) => fv.jira_board_id && fv.fixed_version && 
                fv.jira_board_id.trim() !== '' && fv.fixed_version.trim() !== '')
        .map((fv: any) => ({
          jira_board_id: fv.jira_board_id.trim(),
          fixed_version: fv.fixed_version.trim()
        }))
    }));

    const payload: ReleaseUpdateDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      release_date: formValue.release_date,
      status: formValue.status,
      jira_release_version: formValue.jira_release_version || undefined,
      chg_number: formValue.chg_number || undefined,
      release_type: formValue.release_type || undefined,
      participating_products: formValue.participating_products,
      product_scopes: productScopes
    };

    this.releaseApi.update(releaseId, payload).subscribe({
      next: (release) => {
        this.router.navigate(['/releases', release._id]);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to update release');
        this.loading.set(false);
      }
    });
  }

  onCancel() {
    const releaseId = this.route.snapshot.paramMap.get('id');
    if (releaseId) {
      this.router.navigate(['/releases', releaseId]);
    } else {
      this.router.navigateByUrl('/releases');
    }
  }
}
