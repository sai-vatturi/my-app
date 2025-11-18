import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Squad, SquadCreate, SquadUpdate } from '../models/squad.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SquadService {
  private squadsSignal = signal<Squad[]>([]);
  squads = this.squadsSignal.asReadonly();

  constructor(private api: ApiService) {}

  getAll(): Observable<Squad[]> {
    return this.api.get<Squad[]>('/squads').pipe(
      tap(squads => {
        const normalized = squads.map(s => ({ ...s, id: s.id || s._id }));
        this.squadsSignal.set(normalized);
      })
    );
  }

  getById(id: string): Observable<Squad> {
    return this.api.get<Squad>(`/squads/${id}`);
  }

  create(squad: SquadCreate): Observable<Squad> {
    return this.api.post<Squad>('/squads', squad).pipe(
      tap(newSquad => {
        this.squadsSignal.update(squads => [...squads, newSquad]);
      })
    );
  }

  update(id: string, squad: SquadUpdate): Observable<Squad> {
    return this.api.put<Squad>(`/squads/${id}`, squad).pipe(
      tap(updatedSquad => {
        this.squadsSignal.update(squads =>
          squads.map(s => s.id === id ? updatedSquad : s)
        );
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`/squads/${id}`).pipe(
      tap(() => {
        this.squadsSignal.update(squads =>
          squads.filter(s => s.id !== id)
        );
      })
    );
  }
}
