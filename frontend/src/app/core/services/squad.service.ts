import { Injectable } from '@angular/core';
import { Squad, SquadCreate, SquadUpdate } from '../models/squad.model';
import { ApiService } from './api.service';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class SquadService extends BaseService<Squad, SquadCreate, SquadUpdate> {
  protected override endpoint = '/squads';

  constructor(protected override api: ApiService) {
    super(api);
  }

  // Alias for compatibility
  get squads() {
    return this.items;
  }
}
