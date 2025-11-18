import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { ProductCreate, ProductUpdate, JiraBoardInfo } from '../../../core/models/product.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
  })
export class ProductFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  productId: string | null = null;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      product_owners: this.fb.array([]),
      team_leads: this.fb.array([]),
      principal_engineers: this.fb.array([]),
      jira_boards: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.productId;

    if (this.isEdit && this.productId) {
      this.loadProduct(this.productId);
    }
  }

  get productOwners(): FormArray {
    return this.form.get('product_owners') as FormArray;
  }

  get teamLeads(): FormArray {
    return this.form.get('team_leads') as FormArray;
  }

  get principalEngineers(): FormArray {
    return this.form.get('principal_engineers') as FormArray;
  }

  get jiraBoards(): FormArray {
    return this.form.get('jira_boards') as FormArray;
  }

  addProductOwner(): void {
    this.productOwners.push(this.fb.control(''));
  }

  removeProductOwner(index: number): void {
    this.productOwners.removeAt(index);
  }

  addTeamLead(): void {
    this.teamLeads.push(this.fb.control(''));
  }

  removeTeamLead(index: number): void {
    this.teamLeads.removeAt(index);
  }

  addPrincipalEngineer(): void {
    this.principalEngineers.push(this.fb.control(''));
  }

  removePrincipalEngineer(index: number): void {
    this.principalEngineers.removeAt(index);
  }

  addJiraBoard(): void {
    this.jiraBoards.push(this.fb.group({
      board_id: [''],
      board_name: ['']
    }));
  }

  removeJiraBoard(index: number): void {
    this.jiraBoards.removeAt(index);
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          name: product.name,
          description: product.description || ''
        });

        // Populate arrays
        product.product_owners?.forEach(owner => {
          this.productOwners.push(this.fb.control(owner));
        });

        product.team_leads?.forEach(lead => {
          this.teamLeads.push(this.fb.control(lead));
        });

        product.principal_engineers?.forEach(engineer => {
          this.principalEngineers.push(this.fb.control(engineer));
        });

        product.jira_boards.forEach(board => {
          this.jiraBoards.push(this.fb.group({
            board_id: [board.board_id],
            board_name: [board.board_name]
          }));
        });

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load product');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const data = {
      ...formValue,
      product_owners: formValue.product_owners.filter((v: string) => v.trim()),
      team_leads: formValue.team_leads.filter((v: string) => v.trim()),
      principal_engineers: formValue.principal_engineers.filter((v: string) => v.trim()),
      jira_boards: formValue.jira_boards.filter((b: JiraBoardInfo) => b.board_id && b.board_name)
    };

    const request$ = this.isEdit && this.productId
      ? this.productService.update(this.productId, data as ProductUpdate)
      : this.productService.create(data as ProductCreate);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.message || 'Failed to save product');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }
}
