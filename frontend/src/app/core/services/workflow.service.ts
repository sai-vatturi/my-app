import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Workflow, WorkflowCreate, WorkflowUpdate } from '../models/workflow.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  // Reactive state
  private workflows = signal<Workflow[]>([]);
  private loading = signal(false);

  constructor(private api: ApiService) {}

  // Reactive getters
  get workflows$() {
    return this.workflows;
  }

  get loading$() {
    return this.loading;
  }

  // API methods
  getAll(): Observable<Workflow[]> {
    this.loading.set(true);
    return this.api.get<Workflow[]>('/workflows').pipe(
      tap(workflows => {
        this.workflows.set(workflows);
        this.loading.set(false);
      })
    );
  }

  getById(id: string): Observable<Workflow> {
    return this.api.get<Workflow>(`/workflows/${id}`);
  }

  create(workflow: WorkflowCreate): Observable<Workflow> {
    return this.api.post<Workflow>('/workflows', workflow).pipe(
      tap(newWorkflow => {
        this.workflows.update(current => [...current, newWorkflow]);
      })
    );
  }

  update(id: string, workflow: WorkflowUpdate): Observable<Workflow> {
    return this.api.put<Workflow>(`/workflows/${id}`, workflow).pipe(
      tap(updatedWorkflow => {
        this.workflows.update(current =>
          current.map(w => w.id === id || w._id === id ? updatedWorkflow : w)
        );
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/workflows/${id}`).pipe(
      tap(() => {
        this.workflows.update(current => current.filter(w => w.id !== id && w._id !== id));
      })
    );
  }
}
