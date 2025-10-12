import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Squad, SquadCreateDto, SquadUpdateDto } from '../models/squad.model';

export interface SquadQueryParams {
  skip?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class SquadApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'squads';

  getAll(params?: SquadQueryParams): Observable<Squad[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<Squad[]>(this.endpoint, { params: httpParams });
  }

  getById(id: string): Observable<Squad> {
    return this.http.get<Squad>(`${this.endpoint}/${id}`);
  }

  create(data: SquadCreateDto): Observable<Squad> {
    return this.http.post<Squad>(this.endpoint, data);
  }

  update(id: string, data: SquadUpdateDto): Observable<Squad> {
    return this.http.put<Squad>(`${this.endpoint}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }
}
