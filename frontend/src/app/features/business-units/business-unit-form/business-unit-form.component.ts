import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-business-unit-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, AlertComponent, LoadingSpinnerComponent],
    templateUrl: './business-unit-form.component.html'
})
export class BusinessUnitFormComponent implements OnInit {
    form: FormGroup;
    isEditMode = signal(false);
    loading = signal(false);
    error = signal<string | null>(null);
    unitId: string | null = null;

    constructor(
        private fb: FormBuilder,
        private businessUnitService: BusinessUnitService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.unitId = this.route.snapshot.paramMap.get('id');
        if (this.unitId) {
            this.isEditMode.set(true);
            this.loadUnit(this.unitId);
        }
    }

    loadUnit(id: string): void {
        this.loading.set(true);
        this.businessUnitService.getById(id).subscribe({
            next: (unit) => {
                this.form.patchValue(unit);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Failed to load business unit');
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.loading.set(true);
        const unitData = this.form.value;

        const request = this.isEditMode() && this.unitId
            ? this.businessUnitService.update(this.unitId, unitData)
            : this.businessUnitService.create(unitData);

        request.subscribe({
            next: () => {
                this.router.navigate(['/business-units']);
            },
            error: (err) => {
                this.error.set(err.message || 'An error occurred');
                this.loading.set(false);
            }
        });
    }
}
