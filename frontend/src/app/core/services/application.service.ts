import { Injectable } from '@angular/core';
import { Application } from '../models/application.model';
import { ApiService } from './api.service';
import { BaseService } from './base.service';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService extends BaseService<Application> {
    protected override endpoint = '/applications';

    constructor(protected override api: ApiService) {
        super(api);
    }

    // Alias for compatibility if needed, though 'applications' signal in original was public.
    // BaseService has 'items'. We can alias it.
    get applications() {
        return this.items;
    }
}
