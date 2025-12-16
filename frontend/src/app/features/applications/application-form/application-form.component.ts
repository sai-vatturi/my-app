import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
    selector: 'app-application-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, AlertComponent, LoadingSpinnerComponent, ButtonComponent],
    templateUrl: './application-form.component.html'
})
export class ApplicationFormComponent implements OnInit {
    applicationForm: FormGroup;
    isEditMode = signal<boolean>(false);
    submitting = signal<boolean>(false);
    loading = signal<boolean>(false);
    error = signal<string | null>(null);
    applicationId: string | null = null;

    constructor(
        private fb: FormBuilder,
        private applicationService: ApplicationService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.applicationForm = this.fb.group({
            name: ['', Validators.required],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.applicationId = this.route.snapshot.paramMap.get('id');
        if (this.applicationId) {
            this.isEditMode.set(true);
            this.loadApplication(this.applicationId);
        }
    }

    loadApplication(id: string): void {
        this.applicationService.getById(id).subscribe({
            next: (app) => {
                this.applicationForm.patchValue({
                    name: app.name,
                    description: app.description
                });
            },
            error: (err) => console.error('Error loading application', err)
        });
    }

    onSubmit(): void {
        if (this.applicationForm.valid) {
            this.submitting.set(true);
            const applicationData = this.applicationForm.value;

            const action = this.isEditMode()
                ? this.applicationService.update(this.applicationId!, applicationData)
                : this.applicationService.create(applicationData);

            action.subscribe({
                next: () => {
                    this.router.navigate(['/applications']);
                },
                error: (err) => {
                    console.error('Error saving application', err);
                    this.submitting.set(false);
                }
            });
        }
    }
}
