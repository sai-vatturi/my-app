import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SquadService } from '../../../core/services/squad.service';
import { SquadCreate, SquadUpdate } from '../../../core/models/squad.model';
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

  constructor(private fb: FormBuilder, private squadService: SquadService, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({ name: ['', Validators.required], description: [''], team_leads: this.fb.array([]) });
  }

  ngOnInit(): void {
    this.squadId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.squadId;
    if (this.isEdit && this.squadId) this.loadSquad(this.squadId);
  }

  get teamLeads(): FormArray { return this.form.get('team_leads') as FormArray; }
  addTeamLead(): void { this.teamLeads.push(this.fb.control('')); }
  removeTeamLead(index: number): void { this.teamLeads.removeAt(index); }

  loadSquad(id: string): void {
    this.loading.set(true);
    this.squadService.getById(id).subscribe({
      next: (squad) => {
        this.form.patchValue({ name: squad.name, description: squad.description || '' });
        squad.team_leads?.forEach(lead => this.teamLeads.push(this.fb.control(lead)));
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.message || 'Failed to load squad'); }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const data = { ...this.form.value, team_leads: this.form.value.team_leads.filter((v: string) => v.trim()) };
    const request$ = this.isEdit && this.squadId ? this.squadService.update(this.squadId, data as SquadUpdate) : this.squadService.create(data as SquadCreate);
    request$.subscribe({
      next: () => { this.submitting.set(false); this.router.navigate(['/squads']); },
      error: (err) => { this.submitting.set(false); this.error.set(err.message || 'Failed to save squad'); }
    });
  }

  cancel(): void { this.router.navigate(['/squads']); }
}
