import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { ReleaseCreate, ReleaseUpdate, ReleaseType } from '../../../core/models/release.model';
import { Product } from '../../../core/models/product.model';
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
  
  releaseTypes = Object.values(ReleaseType);

  constructor(
    private fb: FormBuilder,
    private releaseService: ReleaseService,
    private productService: ProductService,
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
      overall_scope: [''],
      products: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.releaseId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.releaseId;
    if (this.isEdit && this.releaseId) this.loadRelease(this.releaseId);
  }

  get products(): FormArray { return this.form.get('products') as FormArray; }

  getPocsArray(productIndex: number): FormArray {
    return this.products.at(productIndex).get('pocs') as FormArray;
  }

  getFixedVersionsArray(productIndex: number): FormArray {
    return this.products.at(productIndex).get('fixed_versions') as FormArray;
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => this.availableProducts.set(products),
      error: (err) => this.error.set('Failed to load products')
    });
  }

  addProduct(): void {
    this.products.push(this.fb.group({
      product_id: [''],
      scope_description: [''],
      pocs: this.fb.array([]),
      fixed_versions: this.fb.array([])
    }));
  }

  removeProduct(index: number): void { this.products.removeAt(index); }

  addPoc(productIndex: number): void {
    this.getPocsArray(productIndex).push(this.fb.control(''));
  }

  removePoc(productIndex: number, pocIndex: number): void {
    this.getPocsArray(productIndex).removeAt(pocIndex);
  }

  addFixedVersion(productIndex: number): void {
    this.getFixedVersionsArray(productIndex).push(this.fb.group({
      jira_board_id: [''],
      fixed_version: ['']
    }));
  }

  removeFixedVersion(productIndex: number, versionIndex: number): void {
    this.getFixedVersionsArray(productIndex).removeAt(versionIndex);
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

        release.products.forEach(product => {
          const productGroup = this.fb.group({
            product_id: [product.product_id],
            scope_description: [product.scope_description || ''],
            pocs: this.fb.array(product.pocs.map(poc => this.fb.control(poc))),
            fixed_versions: this.fb.array(
              product.fixed_versions.map(fv => this.fb.group({
                jira_board_id: [fv.jira_board_id],
                fixed_version: [fv.fixed_version]
              }))
            )
          });
          this.products.push(productGroup);
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
    const data = {
      ...formValue,
      products: formValue.products.map((p: any) => ({
        ...p,
        pocs: p.pocs.filter((poc: string) => poc.trim()),
        fixed_versions: p.fixed_versions.filter((fv: any) => fv.jira_board_id && fv.fixed_version)
      }))
    };

    const request$ = this.isEdit && this.releaseId
      ? this.releaseService.update(this.releaseId, data as ReleaseUpdate)
      : this.releaseService.create(data as ReleaseCreate);

    request$.subscribe({
      next: () => { this.submitting.set(false); this.router.navigate(['/releases']); },
      error: (err) => { this.submitting.set(false); this.error.set(err.message || 'Failed to save release'); }
    });
  }

  cancel(): void { this.router.navigate(['/releases']); }
}
