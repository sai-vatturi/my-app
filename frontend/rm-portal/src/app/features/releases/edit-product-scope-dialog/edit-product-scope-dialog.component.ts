import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent, CardBodyComponent, CardHeaderComponent } from '../../../components/ui/card/card.component';
import { ButtonComponent } from '../../../components/ui/button/button.component';
import { ProductScope } from '../../../lib/models/release.model';
import { Product } from '../../../lib/models/product.model';

@Component({
  selector: 'app-edit-product-scope-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    ButtonComponent
  ],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 z-40" (click)="onCancel()"></div>
      
      <!-- Dialog -->
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 class="text-xl font-semibold text-gray-900">Edit Product Scope: {{ product()?.name }}</h2>
          </div>
          
          <!-- Body -->
          <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-160px)]">
            <form [formGroup]="scopeForm">
              <!-- Scope Description -->
              <div class="mb-6">
                <label for="scope_description" class="block text-sm font-medium text-gray-700 mb-2">
                  Scope Description
                </label>
                <textarea
                  id="scope_description"
                  formControlName="scope_description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the scope for this product..."
                ></textarea>
              </div>

              <!-- POCs Section -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Points of Contact (POCs)
                </label>
                @if (pocs.length > 0) {
                  <div class="space-y-2 mb-2">
                    @for (poc of pocs.controls; track $index; let i = $index) {
                      <div class="flex gap-2">
                        <input
                          type="text"
                          [formControl]="$any(poc)"
                          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter POC name or email"
                        />
                        <app-button
                          variant="destructive"
                          size="sm"
                          type="button"
                          (clicked)="removePoc(i)"
                          ariaLabel="Remove POC"
                        >
                          Remove
                        </app-button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-gray-500 mb-2">No POCs added yet</p>
                }
                <app-button
                  variant="secondary"
                  size="sm"
                  type="button"
                  (clicked)="addPoc()"
                  ariaLabel="Add POC"
                >
                  + Add POC
                </app-button>
              </div>

              <!-- Fixed Versions Section -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Fixed Versions
                </label>
                @if (fixedVersions.length > 0) {
                  <div class="space-y-2 mb-2">
                    @for (fv of fixedVersions.controls; track $index; let i = $index) {
                      <div class="flex gap-2">
                        <input
                          type="text"
                          [formControl]="$any(fv).get('jira_board_id')"
                          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="JIRA Board ID or Product Name"
                        />
                        <input
                          type="text"
                          [formControl]="$any(fv).get('fixed_version')"
                          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Fixed Version (e.g., v1.0.0)"
                        />
                        <app-button
                          variant="destructive"
                          size="sm"
                          type="button"
                          (clicked)="removeFixedVersion(i)"
                          ariaLabel="Remove Fixed Version"
                        >
                          Remove
                        </app-button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-gray-500 mb-2">No fixed versions added yet</p>
                }
                <app-button
                  variant="secondary"
                  size="sm"
                  type="button"
                  (clicked)="addFixedVersion()"
                  ariaLabel="Add Fixed Version"
                >
                  + Add Fixed Version
                </app-button>
              </div>
            </form>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <app-button
              variant="ghost"
              type="button"
              (clicked)="onCancel()"
              ariaLabel="Cancel"
            >
              Cancel
            </app-button>
            <app-button
              variant="primary"
              type="button"
              (clicked)="onSave()"
              ariaLabel="Save Changes"
            >
              Save Changes
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditProductScopeDialogComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  isOpen = input.required<boolean>();
  product = input<Product | null>(null);
  productScope = input<ProductScope | null>(null);

  // Outputs
  saved = output<ProductScope>();
  cancelled = output<void>();

  protected readonly scopeForm = this.fb.nonNullable.group({
    scope_description: [''],
    pocs: this.fb.array<string>([]),
    fixed_versions: this.fb.array<{ jira_board_id: string; fixed_version: string }>([])
  });

  get pocs() {
    return this.scopeForm.controls.pocs as FormArray;
  }

  get fixedVersions() {
    return this.scopeForm.controls.fixed_versions as FormArray;
  }

  constructor() {
    // Watch for changes to productScope input
    // When it changes, populate the form
    this.scopeForm.reset();
    const scope = this.productScope();
    if (scope) {
      this.scopeForm.patchValue({
        scope_description: scope.scope_description || ''
      });

      // Populate POCs
      this.pocs.clear();
      scope.pocs.forEach(poc => {
        this.pocs.push(this.fb.control(poc));
      });

      // Populate Fixed Versions
      this.fixedVersions.clear();
      scope.fixed_versions.forEach(fv => {
        this.fixedVersions.push(this.fb.group({
          jira_board_id: [fv.jira_board_id],
          fixed_version: [fv.fixed_version]
        }));
      });
    }
  }

  addPoc() {
    this.pocs.push(this.fb.control(''));
  }

  removePoc(index: number) {
    this.pocs.removeAt(index);
  }

  addFixedVersion() {
    this.fixedVersions.push(this.fb.group({
      jira_board_id: [''],
      fixed_version: ['']
    }));
  }

  removeFixedVersion(index: number) {
    this.fixedVersions.removeAt(index);
  }

  onSave() {
    const formValue = this.scopeForm.getRawValue();
    const scope = this.productScope();
    
    if (!scope) return;

    const updatedScope: ProductScope = {
      product_id: scope.product_id,
      scope_description: formValue.scope_description || '',
      pocs: formValue.pocs.filter((p: string | null): p is string => p !== null && p.trim() !== ''),
      fixed_versions: formValue.fixed_versions
        .filter((fv: any) => fv.jira_board_id && fv.fixed_version && 
                fv.jira_board_id.trim() !== '' && fv.fixed_version.trim() !== '')
        .map((fv: any) => ({
          jira_board_id: fv.jira_board_id.trim(),
          fixed_version: fv.fixed_version.trim()
        }))
    };

    this.saved.emit(updatedScope);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
