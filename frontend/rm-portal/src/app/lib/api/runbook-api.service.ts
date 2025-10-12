import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Runbook, RunbookCreateDto, RunbookUpdateDto } from '../models/runbook.model';

export interface RunbookQueryParams {
  skip?: number;
  limit?: number;
  release_id?: string;
}

@Injectable({ providedIn: 'root' })
export class RunbookApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'runbooks';

  getAll(params?: RunbookQueryParams): Observable<Runbook[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<Runbook[]>(this.endpoint, { params: httpParams });
  }

  getById(id: string): Observable<Runbook> {
    return this.http.get<Runbook>(`${this.endpoint}/${id}`);
  }

  create(data: RunbookCreateDto): Observable<Runbook> {
    return this.http.post<Runbook>(this.endpoint, data);
  }

  update(id: string, data: RunbookUpdateDto): Observable<Runbook> {
    return this.http.put<Runbook>(`${this.endpoint}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }
}
