import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SquadService } from '../../../core/services/squad.service';
import { ProductService } from '../../../core/services/product.service';
import { SquadCreate, SquadUpdate } from '../../../core/models/squad.model';
import { Product } from '../../../core/models/product.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-squad-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './squad-form.component.html',
  })
export class SquadFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  squadId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  products = signal<Product[]>([]);
  loadingProducts = signal(false);
  
  // Computed signal for available products (reactive to form changes)
  availableProducts = computed(() => {
    const allProducts = this.products();
    const selectedProductIds = this.productsFormArray.controls.map(control => String(control.value || ''));
    return allProducts.filter(product => {
      const productId = String(product.id || product._id || '');
      return !selectedProductIds.includes(productId);
    });
  });

  constructor(
    private fb: FormBuilder,
    private squadService: SquadService,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      team_leads: this.fb.array([]),
      products: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.squadId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.squadId;
    
    this.loadProducts();
    
    if (this.isEdit && this.squadId) {
      this.loadSquad(this.squadId);
    }
  }

  loadProducts(): void {
    this.loadingProducts.set(true);
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadingProducts.set(false);
      }
    });
  }

  get teamLeads(): FormArray { return this.form.get('team_leads') as FormArray; }
  addTeamLead(): void { this.teamLeads.push(this.fb.control('')); }
  removeTeamLead(index: number): void { this.teamLeads.removeAt(index); }

  get productsFormArray(): FormArray {
    return this.form.get('products') as FormArray;
  }

  addProductFromDropdown(productId: string): void {
    if (!productId || this.isProductSelected(productId)) return;
    this.productsFormArray.push(this.fb.control(productId));
  }

  removeProduct(index: number): void {
    this.productsFormArray.removeAt(index);
  }

  isProductSelected(productId: string): boolean {
    // Check if product is already selected in THIS squad's form (prevents duplicates within same squad)
    // Note: This does NOT prevent the same product from being added to other squads
    if (!productId) return false;
    const productIdStr = String(productId);
    return this.productsFormArray.controls.some(control => {
      const controlValue = String(control.value || '');
      return controlValue === productIdStr;
    });
  }

  getAvailableProducts() {
    // Use computed signal for reactive updates
    return this.availableProducts();
  }

  getProductName(productId: string): string {
    const product = this.products().find(p => (p.id || p._id) === productId);
    return product?.name || productId;
  }

  loadSquad(id: string): void {
    this.loading.set(true);
    this.squadService.getById(id).subscribe({
      next: (squad) => {
        this.form.patchValue({ name: squad.name, description: squad.description || '' });
        squad.team_leads?.forEach(lead => this.teamLeads.push(this.fb.control(lead)));
        
        // Populate products
        squad.products?.forEach(productId => {
          this.productsFormArray.push(this.fb.control(productId));
        });
        
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load squad'); }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const data = {
      ...this.form.value,
      team_leads: this.form.value.team_leads.filter((v: string) => v.trim()),
      products: this.form.value.products || []
    };
    const request$ = this.isEdit && this.squadId
      ? this.squadService.update(this.squadId, data as SquadUpdate)
      : this.squadService.create(data as SquadCreate);
    request$.subscribe({
      next: () => { this.submitting.set(false); this.router.navigate(['/squads']); },
      error: (err) => { this.submitting.set(false); this.error.set(err.message || 'Failed to save squad'); }
    });
  }

  cancel(): void { this.router.navigate(['/squads']); }
}
