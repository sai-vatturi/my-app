import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Briefcase, AppWindow, Package, Users, ArrowLeft, Edit2 } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { ApplicationService } from '../../../core/services/application.service';
import { ProductService } from '../../../core/services/product.service';
import { SquadService } from '../../../core/services/squad.service';

import { BusinessUnit } from '../../../core/models/business-unit.model';
import { Application } from '../../../core/models/application.model';
import { Product } from '../../../core/models/product.model';
import { Squad } from '../../../core/models/squad.model';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-business-unit-details',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        LucideAngularModule,
        ButtonComponent,
        LoadingSpinnerComponent
    ],
    templateUrl: './business-unit-details.component.html'
})
export class BusinessUnitDetailsComponent implements OnInit {
    // Icons
    readonly Briefcase = Briefcase;
    readonly AppWindow = AppWindow;
    readonly Package = Package;
    readonly Users = Users;
    readonly ArrowLeft = ArrowLeft;
    readonly Edit2 = Edit2;

    // State
    businessUnit = signal<BusinessUnit | null>(null);
    applications = signal<Application[]>([]);
    products = signal<Product[]>([]);
    squads = signal<Squad[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);

    // Computed filtered lists based on business_unit_id
    associatedApplications = computed(() => {
        const unitId = this.getUnitId();
        if (!unitId) return [];
        // Applications don't have business_unit_id directly, they're linked via products
        // We need to find products with this business_unit_id, then get their application_ids
        const productAppIds = new Set<string>();
        this.products()
            .filter(p => p.business_unit_id === unitId)
            .forEach(p => {
                p.application_ids?.forEach(appId => productAppIds.add(appId));
            });
        return this.applications().filter(app => productAppIds.has(app._id || app.id || ''));
    });

    associatedProducts = computed(() => {
        const unitId = this.getUnitId();
        if (!unitId) return [];
        return this.products().filter(p => p.business_unit_id === unitId);
    });

    associatedSquads = computed(() => {
        const unitId = this.getUnitId();
        if (!unitId) return [];
        return this.squads().filter(s => s.business_unit_id === unitId);
    });

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private businessUnitService: BusinessUnitService,
        private applicationService: ApplicationService,
        private productService: ProductService,
        private squadService: SquadService
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadData(id);
        } else {
            this.error.set('Business Unit ID not found');
            this.loading.set(false);
        }
    }

    private getUnitId(): string | null {
        const unit = this.businessUnit();
        return unit?._id || unit?.id || null;
    }

    loadData(unitId: string): void {
        this.loading.set(true);

        // Load all data in parallel
        forkJoin({
            businessUnit: this.businessUnitService.getById(unitId),
            applications: this.applicationService.getAll(),
            products: this.productService.getAll(),
            squads: this.squadService.getAll()
        }).subscribe({
            next: (data) => {
                this.businessUnit.set(data.businessUnit);
                this.applications.set(data.applications);
                this.products.set(data.products);
                this.squads.set(data.squads);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading business unit data:', err);
                this.error.set('Failed to load business unit details');
                this.loading.set(false);
            }
        });
    }

    navigateBack(): void {
        this.router.navigate(['/business-units']);
    }

    navigateToEdit(): void {
        const unitId = this.getUnitId();
        if (unitId) {
            this.router.navigate(['/business-units', unitId, 'edit']);
        }
    }
}
