import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SquadService } from '../../../core/services/squad.service';
import { Squad } from '../../../core/models/squad.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-squad-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './squad-list.component.html',
  })
export class SquadListComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);

  constructor(public squadService: SquadService) {}

  get squads() {
    return this.squadService.squads;
  }

  ngOnInit(): void {
    this.loadSquads();
  }

  loadSquads(): void {
    this.loading.set(true);
    this.error.set(null);

    this.squadService.getAll().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load squads');
      }
    });
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
