import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { BusinessUnit } from '../../../core/models/business-unit.model';
import { LucideAngularModule, Briefcase } from 'lucide-angular';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
    readonly Briefcase = Briefcase;
    businessUnits = signal<BusinessUnit[]>([]);

    private router = inject(Router);

    // Create a signal from router events to trigger re-evaluation
    private currentUrl = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
        ),
        { initialValue: null }
    );

    isVisible = computed(() => {
        // Trigger dependency
        this.currentUrl();
        const url = this.router.url.split('?')[0]; // Ignore query params

        // Exact matches only
        const allowedRoutes = ['/dashboard', '/products', '/squads', '/releases'];
        return allowedRoutes.includes(url);
    });

    constructor(public businessUnitService: BusinessUnitService) { }

    ngOnInit(): void {
        this.businessUnitService.getAll().subscribe(units => {
            this.businessUnits.set(units);
        });
    }

    onUnitChange(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const value = select.value;
        this.businessUnitService.setSelectedUnit(value === 'all' ? null : value);
    }
}
