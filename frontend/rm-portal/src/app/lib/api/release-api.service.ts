import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Release, ReleaseCreateDto, ReleaseUpdateDto } from '../models/release.model';

export interface ReleaseQueryParams {
  skip?: number;
  limit?: number;
  status?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ReleaseApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'releases';

  getAll(params?: ReleaseQueryParams): Observable<Release[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<Release[]>(this.endpoint, { params: httpParams });
  }

  getById(id: string): Observable<Release> {
    return this.http.get<Release>(`${this.endpoint}/${id}`);
  }

  create(data: ReleaseCreateDto): Observable<Release> {
    return this.http.post<Release>(this.endpoint, data);
  }

  update(id: string, data: ReleaseUpdateDto): Observable<Release> {
    return this.http.put<Release>(`${this.endpoint}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }
}
