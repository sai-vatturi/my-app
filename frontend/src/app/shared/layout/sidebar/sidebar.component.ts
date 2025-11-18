import { Component, ChangeDetectionStrategy, signal, effect, Injector, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Package, Users, Rocket, ChevronLeft, ChevronRight, LayoutDashboard, Calendar } from 'lucide-angular';

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SidebarComponent {
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'sidebar-collapsed';
  
  readonly Package = Package;
  readonly Users = Users;
  readonly Rocket = Rocket;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Calendar = Calendar;

  // Reactive state with signal
  isCollapsed = signal<boolean>(this.loadCollapsedState());

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/squads', label: 'Squads', icon: Users },
    { path: '/releases', label: 'Releases', icon: Rocket }
  ];

  constructor() {
    // Persist state changes to localStorage
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.isCollapsed()));
      }
    }, { injector: this.injector });
  }

  toggleSidebar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  private loadCollapsedState(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : false; // Default to expanded
    }
    return false;
  }
}
