import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WorkflowTemplate, WorkflowTemplateCreate, WorkflowTemplateUpdate } from '../models/workflow.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  constructor(private api: ApiService) {}

  getAll(releaseType?: string): Observable<WorkflowTemplate[]> {
    const params = releaseType ? { release_type: releaseType } : undefined;
    return this.api.get<WorkflowTemplate[]>('/workflows', params);
  }

  getById(id: string): Observable<WorkflowTemplate> {
    return this.api.get<WorkflowTemplate>(`/workflows/${id}`);
  }

  create(workflow: WorkflowTemplateCreate): Observable<WorkflowTemplate> {
    return this.api.post<WorkflowTemplate>('/workflows', workflow);
  }

  update(id: string, workflow: WorkflowTemplateUpdate): Observable<WorkflowTemplate> {
    return this.api.put<WorkflowTemplate>(`/workflows/${id}`, workflow);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`/workflows/${id}`);
  }

  getByReleaseType(releaseType: string): Observable<WorkflowTemplate | null> {
    return new Observable(observer => {
      this.getAll(releaseType).subscribe({
        next: (workflows) => {
          const workflow = workflows.find(w => w.release_type === releaseType) || null;
          observer.next(workflow);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}

