import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SquadService } from '../../../core/services/squad.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { ProductService } from '../../../core/services/product.service';
import { Squad } from '../../../core/models/squad.model';
import { Product } from '../../../core/models/product.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LucideAngularModule, Package, ChevronDown, ChevronRight, Users } from 'lucide-angular';

@Component({
  selector: 'app-squad-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent,
    LucideAngularModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './squad-list.component.html',
})
export class SquadListComponent implements OnInit {
  readonly Package = Package;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;
  readonly Users = Users;

  loading = signal(false);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);
  products = signal<Product[]>([]);
  expandedSquadId = signal<string | null>(null);

  constructor(
    public squadService: SquadService,
    private businessUnitService: BusinessUnitService,
    private productService: ProductService
  ) { }

  filteredSquads = computed(() => {
    const squads = this.squadService.squads();
    const selectedUnitId = this.businessUnitService.selectedBusinessUnitId();

    if (!selectedUnitId) {
      return squads;
    }

    return squads.filter(s => s.business_unit_id === selectedUnitId);
  });

  get squads() {
    return this.filteredSquads;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.squadService.getAll().subscribe({
      next: () => {
        this.productService.getAll().subscribe({
          next: (products) => {
            this.products.set(products);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Failed to load products', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load squads');
      }
    });
  }

  getProductsForSquad(squadId: string | undefined): Product[] {
    if (!squadId) return [];
    // Product has squads array of IDs
    return this.products().filter(p => p.squads?.includes(squadId));
  }

  toggleExpand(squad: Squad): void {
    const id = squad.id || squad._id;
    if (this.expandedSquadId() === id) {
      this.expandedSquadId.set(null);
    } else {
      this.expandedSquadId.set(id || null);
    }
  }

  isExpanded(squad: Squad): boolean {
    return this.expandedSquadId() === (squad.id || squad._id);
  }

  deleteSquad(squad: Squad): void {
    if (!confirm(`Are you sure you want to delete "${squad.name}"?`)) {
      return;
    }

    const squadId = squad.id || squad._id;
    if (!squadId) return;

    this.deleting.set(squadId);

    this.squadService.delete(squadId).subscribe({
      next: () => {
        this.deleting.set(null);
      },
      error: (err) => {
        this.deleting.set(null);
        this.error.set(err.message || 'Failed to delete squad');
      }
    });
  }
}
