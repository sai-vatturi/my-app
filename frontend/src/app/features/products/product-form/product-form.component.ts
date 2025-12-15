import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { SquadService } from '../../../core/services/squad.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { ApplicationService } from '../../../core/services/application.service';
import { ProductCreate, ProductUpdate, JiraBoardInfo } from '../../../core/models/product.model';
import { Squad } from '../../../core/models/squad.model';
import { BusinessUnit } from '../../../core/models/business-unit.model';
import { Application } from '../../../core/models/application.model';
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
  squads = signal<Squad[]>([]);
  businessUnits = signal<BusinessUnit[]>([]);
  applications = signal<Application[]>([]);
  loadingSquads = signal(false);
  loadingBusinessUnits = signal(false);
  loadingApplications = signal(false);

  // Computed signal for available squads
  availableSquads = computed(() => {
    const allSquads = this.squads();
    const selectedSquadIds = this.squadsFormArray.controls.map(control => String(control.value || ''));
    return allSquads.filter(squad => {
      const squadId = String(squad.id || squad._id || '');
      return !selectedSquadIds.includes(squadId);
    });
  });

  // Computed signal for available applications
  availableApplications = computed(() => {
    const allApps = this.applications();
    const selectedAppIds = this.applicationsFormArray.controls.map(control => String(control.value || ''));
    return allApps.filter(app => {
      const appId = String(app.id || app._id || '');
      return !selectedAppIds.includes(appId);
    });
  });

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private squadService: SquadService,
    private businessUnitService: BusinessUnitService,
    private applicationService: ApplicationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      business_unit_id: ['', Validators.required],
      product_owners: this.fb.array([]),
      team_leads: this.fb.array([]),
      principal_engineers: this.fb.array([]),
      jira_boards: this.fb.array([]),
      squads: this.fb.array([]),
      application_ids: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.productId;

    this.loadSquads();
    this.loadBusinessUnits();
    this.loadApplications();

    if (this.isEdit && this.productId) {
      this.loadProduct(this.productId);
    }
  }

  loadSquads(): void {
    this.loadingSquads.set(true);
    this.squadService.getAll().subscribe({
      next: (squads) => {
        this.squads.set(squads);
        this.loadingSquads.set(false);
      },
      error: () => {
        this.loadingSquads.set(false);
      }
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

  loadApplications(): void {
    this.loadingApplications.set(true);
    this.applicationService.getAll().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loadingApplications.set(false);
      },
      error: () => {
        this.loadingApplications.set(false);
      }
    });
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

  get squadsFormArray(): FormArray {
    return this.form.get('squads') as FormArray;
  }

  get applicationsFormArray(): FormArray {
    return this.form.get('application_ids') as FormArray;
  }

  addSquadFromDropdown(squadId: string): void {
    if (!squadId || this.isSquadSelected(squadId)) return;
    this.squadsFormArray.push(this.fb.control(squadId));
  }

  removeSquad(index: number): void {
    this.squadsFormArray.removeAt(index);
  }

  isSquadSelected(squadId: string): boolean {
    if (!squadId) return false;
    const squadIdStr = String(squadId);
    return this.squadsFormArray.controls.some(control => {
      const controlValue = String(control.value || '');
      return controlValue === squadIdStr;
    });
  }

  getSquadName(squadId: string): string {
    const squad = this.squads().find(s => (s.id || s._id) === squadId);
    return squad?.name || squadId;
  }

  addApplicationFromDropdown(appId: string): void {
    if (!appId || this.isApplicationSelected(appId)) return;
    this.applicationsFormArray.push(this.fb.control(appId));
  }

  removeApplication(index: number): void {
    this.applicationsFormArray.removeAt(index);
  }

  isApplicationSelected(appId: string): boolean {
    if (!appId) return false;
    const appIdStr = String(appId);
    return this.applicationsFormArray.controls.some(control => {
      const controlValue = String(control.value || '');
      return controlValue === appIdStr;
    });
  }

  getApplicationName(appId: string): string {
    const app = this.applications().find(a => (a.id || a._id) === appId);
    return app?.name || appId;
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
          description: product.description || '',
          business_unit_id: product.business_unit_id || ''
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

        // Populate squads
        product.squads?.forEach(squadId => {
          this.squadsFormArray.push(this.fb.control(squadId));
        });

        // Populate applications
        product.application_ids?.forEach(appId => {
          this.applicationsFormArray.push(this.fb.control(appId));
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
      jira_boards: formValue.jira_boards.filter((b: JiraBoardInfo) => b.board_id && b.board_name),
      squads: formValue.squads || [],
      application_ids: formValue.application_ids || []
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
