import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  protected readonly navLinks = [
    { label: 'Releases', route: '/releases', exact: false },
    { label: 'Products', route: '/products', exact: false },
    { label: 'Squads', route: '/squads', exact: false }
  ];

  protected readonly isSidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
