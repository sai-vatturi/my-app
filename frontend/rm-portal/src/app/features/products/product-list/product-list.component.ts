import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroPencil, heroTrash, heroXMark } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { CardComponent, CardBodyComponent } from '../../../components/ui/card/card.component';
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../components/ui/empty-state/empty-state.component';
import { ProductApiService } from '../../../lib/api/product-api.service';
import { Product } from '../../../lib/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconComponent,
    ButtonComponent,
    CardComponent,
    CardBodyComponent,
    SpinnerComponent,
    EmptyStateComponent
  ],
  providers: [provideIcons({ heroPlus, heroPencil, heroTrash, heroXMark })],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private readonly productApi = inject(ProductApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editingProduct = signal<Product | null>(null);
  protected readonly submitting = signal(false);

  protected readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    product_owner: [''],
    technical_lead: [''],
    fixed_versions: this.fb.array<string>([])
  });

  get fixedVersions(): FormArray {
    return this.productForm.get('fixed_versions') as FormArray;
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set(null);
    this.productApi.getAll({ limit: 100 }).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load products');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  onAdd() {
    this.editingProduct.set(null);
    this.productForm.reset();
    this.showForm.set(true);
  }

  onEdit(product: Product) {
    this.editingProduct.set(product);
    this.productForm.patchValue({
      name: product.name,
      description: product.description || '',
      product_owner: product.product_owner || '',
      technical_lead: product.technical_lead || ''
    });
    
    // Clear and populate fixed versions
    this.fixedVersions.clear();
    if (product.fixed_versions && product.fixed_versions.length > 0) {
      product.fixed_versions.forEach(version => {
        this.fixedVersions.push(this.fb.control(version, Validators.required));
      });
    }
    
    this.showForm.set(true);
  }

  addFixedVersion() {
    this.fixedVersions.push(this.fb.control('', Validators.required));
  }

  removeFixedVersion(index: number) {
    this.fixedVersions.removeAt(index);
  }

  onCancel() {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.productForm.reset();
    this.fixedVersions.clear();
  }

  onSubmit() {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.submitting.set(true);
    const formValue = this.productForm.getRawValue();
    const payload = {
      name: formValue.name,
      description: formValue.description || undefined,
      product_owner: formValue.product_owner || undefined,
      technical_lead: formValue.technical_lead || undefined,
      fixed_versions: formValue.fixed_versions
        .filter((v: string | null): v is string => v !== null && v.trim() !== '')
    };

    const operation = this.editingProduct()
      ? this.productApi.update(this.editingProduct()!._id, payload)
      : this.productApi.create(payload);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.productForm.reset();
        this.loadProducts();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Failed to save product');
        console.error(err);
      }
    });
  }

  onDelete(product: Product) {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productApi.delete(product._id).subscribe({
      next: () => {
        this.loadProducts();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to delete product');
        console.error(err);
      }
    });
  }
}
