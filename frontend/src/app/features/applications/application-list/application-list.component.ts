import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Plus, Edit2, Trash2, AppWindow, Package, ChevronDown, ChevronRight } from 'lucide-angular';
import { ApplicationService } from '../../../core/services/application.service';
import { ProductService } from '../../../core/services/product.service';
import { Application } from '../../../core/models/application.model';
import { Product } from '../../../core/models/product.model';

@Component({
    selector: 'app-application-list',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './application-list.component.html'
})
export class ApplicationListComponent implements OnInit {
    readonly Plus = Plus;
    readonly Edit2 = Edit2;
    readonly Trash2 = Trash2;
    readonly AppWindow = AppWindow;
    readonly Package = Package;
    readonly ChevronDown = ChevronDown;
    readonly ChevronRight = ChevronRight;

    applications = signal<Application[]>([]);
    products = signal<Product[]>([]);
    loading = signal<boolean>(false);
    expandedAppId = signal<string | null>(null);

    constructor(
        private applicationService: ApplicationService,
        private productService: ProductService
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.loading.set(true);
        // Load both applications and products

        // nesting subscribes for simplicity, could utilize forkJoin
        this.applicationService.getAll().subscribe({
            next: (apps) => {
                this.applications.set(apps);
                this.productService.getAll().subscribe({
                    next: (products) => {
                        this.products.set(products);
                        this.loading.set(false);
                    },
                    error: (err) => {
                        console.error('Error loading products', err);
                        this.loading.set(false);
                    }
                });
            },
            error: (error) => {
                console.error('Error loading applications:', error);
                this.loading.set(false);
            }
        });
    }

    toggleExpand(app: Application): void {
        const id = app.id || app._id;
        if (this.expandedAppId() === id) {
            this.expandedAppId.set(null);
        } else {
            this.expandedAppId.set(id || null);
        }
    }

    isExpanded(app: Application): boolean {
        return this.expandedAppId() === (app.id || app._id);
    }

    getProductsForApplication(appId: string | undefined): Product[] {
        if (!appId) return [];
        return this.products().filter(p => p.application_ids?.includes(appId));
    }

    deleteApplication(app: Application): void {
        if (confirm(`Are you sure you want to delete ${app.name}?`)) {
            const id = app.id || app._id;
            if (id) {
                this.applicationService.delete(id).subscribe(() => {
                    this.loadData();
                });
            }
        }
    }
}
