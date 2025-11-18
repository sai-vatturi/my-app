import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, Clock, Tag, X } from 'lucide-angular';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { Release } from '../../../core/models/release.model';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  releases: Release[];
}

interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: 'app-release-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-calendar.component.html',
  styles: []
})
export class ReleaseCalendarComponent implements OnInit {
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Tag = Tag;
  readonly X = X;

  currentDate = signal<Date>(new Date());
  releases = signal<Release[]>([]);
  products = signal<any[]>([]);
  selectedRelease = signal<Release | null>(null);
  moreReleasesDay = signal<CalendarDay | null>(null);

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate year options (current year ±5 years)
  yearOptions: number[] = (() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  })();

  currentMonthYear = computed(() => {
    const date = this.currentDate();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarWeeks = computed(() => {
    return this.generateCalendar(this.currentDate(), this.releases());
  });

  constructor(
    private releaseService: ReleaseService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadReleases();
  }

  private loadProducts(): void {
    this.productService.getAll().subscribe(products => {
      this.products.set(products);
    });
  }

  private loadReleases(): void {
    const date = this.currentDate();
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    this.releaseService.getByDateRange(startDate, endDate).subscribe(releases => {
      this.releases.set(releases);
    });
  }

  previousMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.loadReleases();
  }

  nextMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.loadReleases();
  }

  goToToday(): void {
    this.currentDate.set(new Date());
    this.loadReleases();
  }

  onMonthChange(month: number): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), month, 1));
    this.loadReleases();
  }

  onYearChange(year: number): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(year, current.getMonth(), 1));
    this.loadReleases();
  }

  private generateCalendar(date: Date, releases: Release[]): CalendarWeek[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const startDayOfWeek = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weeks: CalendarWeek[] = [];
    let currentWeek: CalendarDay[] = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      currentWeek.push({
        date: dayDate,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
        releases: []
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayReleases = this.getReleasesForDate(dayDate, releases);
      
      currentWeek.push({
        date: dayDate,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: this.isSameDay(dayDate, today),
        releases: dayReleases
      });
      
      if (currentWeek.length === 7) {
        weeks.push({ days: currentWeek });
        currentWeek = [];
      }
    }
    
    // Next month days
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      const dayDate = new Date(year, month + 1, nextMonthDay);
      currentWeek.push({
        date: dayDate,
        dayNumber: nextMonthDay,
        isCurrentMonth: false,
        isToday: false,
        releases: []
      });
      nextMonthDay++;
    }
    
    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }
    
    return weeks;
  }

  private getReleasesForDate(date: Date, releases: Release[]): Release[] {
    return releases.filter(release => {
      const releaseDate = new Date(release.release_date);
      return this.isSameDay(releaseDate, date);
    });
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getReleaseColor(releaseType: string): string {
    const colors: Record<string, string> = {
      'Major release': '#dbeafe',
      'Hotfix': '#fee2e2',
      'Data patch': '#fef3c7',
      'Hotfix & Data patch': '#e9d5ff'
    };
    return colors[releaseType] || '#f3f4f6';
  }

  openReleaseDetail(release: Release): void {
    this.selectedRelease.set(release);
    this.moreReleasesDay.set(null);
  }

  closeReleaseDetail(): void {
    this.selectedRelease.set(null);
  }

  showMoreReleases(day: CalendarDay): void {
    this.moreReleasesDay.set(day);
  }

  closeMoreReleases(): void {
    this.moreReleasesDay.set(null);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatReleaseDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getProductName(productId: string): string {
    const product = this.products().find(p => p.id === productId || p._id === productId);
    return product?.name || 'Unknown Product';
  }

  getReleaseId(release: Release | null | undefined): string {
    if (!release) return '';
    return release.id || release._id || '';
  }
}
