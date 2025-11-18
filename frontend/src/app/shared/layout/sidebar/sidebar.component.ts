import { Component, ChangeDetectionStrategy, signal, effect, Injector, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Package, Users, Rocket, ChevronLeft, ChevronRight, LayoutDashboard, Calendar, GitBranch } from 'lucide-angular';

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
  readonly GitBranch = GitBranch;

  // Reactive state with signal
  isCollapsed = signal<boolean>(this.loadCollapsedState());

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/squads', label: 'Squads', icon: Users },
    { path: '/releases', label: 'Releases', icon: Rocket },
    { path: '/workflows', label: 'Workflows', icon: GitBranch }
  ];

  constructor() {
    // Auto-collapse on mobile
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobileView();
      window.addEventListener('resize', () => this.checkMobileView());
    }
    
    // Persist state changes to localStorage
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.isCollapsed()));
      }
    }, { injector: this.injector });
  }

  private checkMobileView(): void {
    if (window.innerWidth < 768) { // md breakpoint - mobile
      // On mobile, always collapsed (small view)
      this.isCollapsed.set(true);
    } else {
      // On desktop, always expanded by default (unless user manually collapsed)
      // Only use saved state if it was explicitly set by user
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const saved = JSON.parse(stored);
        // Only restore if it was explicitly set (not from mobile auto-collapse)
        this.isCollapsed.set(saved);
      } else {
        // Default to expanded on desktop
        this.isCollapsed.set(false);
      }
    }
  }

  toggleSidebar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  private loadCollapsedState(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      // On desktop, default to expanded (false = not collapsed)
      // On mobile, will be set to true by checkMobileView
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  }
}
