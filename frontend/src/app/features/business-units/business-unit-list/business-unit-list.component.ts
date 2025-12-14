import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { BusinessUnit } from '../../../core/models/business-unit.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
    selector: 'app-business-unit-list',
    standalone: true,
    imports: [CommonModule, RouterModule, LoadingSpinnerComponent, ButtonComponent],
    templateUrl: './business-unit-list.component.html'
})
export class BusinessUnitListComponent implements OnInit {
    businessUnits = signal<BusinessUnit[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);

    constructor(private businessUnitService: BusinessUnitService) { }

    ngOnInit(): void {
        this.loadBusinessUnits();
    }

    loadBusinessUnits(): void {
        this.loading.set(true);
        this.businessUnitService.getAll().subscribe({
            next: (units) => {
                this.businessUnits.set(units);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load business units');
                this.loading.set(false);
            }
        });
    }

    deleteUnit(id: string): void {
        if (!confirm('Are you sure you want to delete this Business Unit?')) return;

        this.businessUnitService.delete(id).subscribe({
            next: () => {
                this.businessUnits.update(units => units.filter(u => u._id !== id && u.id !== id));
            },
            error: () => alert('Failed to delete business unit')
        });
    }
}
