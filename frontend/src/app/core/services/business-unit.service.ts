import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BusinessUnit } from '../models/business-unit.model';
import { ApiService } from './api.service';
import { BaseService } from './base.service';

@Injectable({
    providedIn: 'root'
})
export class BusinessUnitService extends BaseService<BusinessUnit> {
    protected override endpoint = '/business-units';
    private readonly platformId = inject(PLATFORM_ID);
    private readonly STORAGE_KEY = 'selected_business_unit_id';

    // Global state for selected Business Unit
    selectedBusinessUnitId = signal<string | null>(this.loadSelectedUnit());

    constructor(protected override api: ApiService) {
        super(api);

        // Persist selection to localStorage whenever it changes
        effect(() => {
            if (isPlatformBrowser(this.platformId)) {
                const id = this.selectedBusinessUnitId();
                if (id) {
                    localStorage.setItem(this.STORAGE_KEY, id);
                } else {
                    localStorage.removeItem(this.STORAGE_KEY);
                }
            }
        });
    }

    private loadSelectedUnit(): string | null {
        if (isPlatformBrowser(this.platformId)) {
            return localStorage.getItem(this.STORAGE_KEY);
        }
        return null;
    }

    setSelectedUnit(id: string | null): void {
        this.selectedBusinessUnitId.set(id);
    }
}
