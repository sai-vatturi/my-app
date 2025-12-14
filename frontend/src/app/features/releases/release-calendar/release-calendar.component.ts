import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, Clock, Tag, X, Briefcase } from 'lucide-angular';
import { ReleaseService } from '../../../core/services/release.service';
import { ProductService } from '../../../core/services/product.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { BusinessUnitService } from '../../../core/services/business-unit.service';
import { Release } from '../../../core/models/release.model';
import { BusinessUnit } from '../../../core/models/business-unit.model';

interface CalendarEvent {
  type: 'release' | 'stage';
  title: string;
  time: string;
  date: Date;
  color: string;
  borderColor: string;
  data: any; // Release object
  stageOrder?: number;
  businessUnitName?: string;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
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
  readonly Briefcase = Briefcase;

  currentDate = signal<Date>(new Date());
  releases = signal<Release[]>([]);
  products = signal<any[]>([]);
  workflows = signal<Map<string, any>>(new Map()); // Map release_type -> WorkflowTemplate
  businessUnits = signal<Map<string, string>>(new Map()); // Map ID -> Name
  businessUnitList = signal<BusinessUnit[]>([]);
  selectedRelease = signal<Release | null>(null);
  selectedWorkflow = signal<any | null>(null);
  moreEventsDay = signal<CalendarDay | null>(null);

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
    return this.generateCalendar(
      this.currentDate(),
      this.releases(),
      this.workflows(),
      this.businessUnits(),
      this.businessUnitService.selectedBusinessUnitId()
    );
  });

  constructor(
    private releaseService: ReleaseService,
    private productService: ProductService,
    private workflowService: WorkflowService,
    public businessUnitService: BusinessUnitService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadWorkflows();
    this.loadBusinessUnits();
    this.loadReleases();
  }

  private loadProducts(): void {
    this.productService.getAll().subscribe(products => {
      this.products.set(products);
    });
  }

  private loadWorkflows(): void {
    this.workflowService.getAll().subscribe(workflows => {
      const map = new Map<string, any>();
      workflows.forEach(w => map.set(w.release_type, w));
      this.workflows.set(map);
    });
  }

  private loadBusinessUnits(): void {
    this.businessUnitService.getAll().subscribe(units => {
      this.businessUnitList.set(units);
      const map = new Map<string, string>();
      units.forEach(u => {
        if (u.id || u._id) map.set(u.id || u._id || '', u.name);
      });
      this.businessUnits.set(map);
    });
  }

  onBusinessUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.businessUnitService.setSelectedUnit(value === 'all' ? null : value);
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

  private generateCalendar(
    date: Date,
    releases: Release[],
    workflowMap: Map<string, any>,
    businessUnitMap: Map<string, string>,
    selectedUnitId: string | null
  ): CalendarWeek[] {
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
        events: []
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const events = this.getEventsForDate(dayDate, releases, workflowMap, businessUnitMap, selectedUnitId);

      currentWeek.push({
        date: dayDate,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: this.isSameDay(dayDate, today),
        events: events
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
        events: []
      });
      nextMonthDay++;
    }

    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }

    return weeks;
  }

  private getEventsForDate(
    date: Date,
    releases: Release[],
    workflowMap: Map<string, any>,
    businessUnitMap: Map<string, string>,
    selectedUnitId: string | null
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    releases.forEach(release => {
      // Filter by Business Unit if selected
      if (selectedUnitId && release.business_unit_id !== selectedUnitId) {
        return;
      }

      // 1. Release Event
      const releaseDate = new Date(release.release_date);
      if (this.isSameDay(releaseDate, date)) {
        events.push({
          type: 'release',
          title: release.name,
          time: this.formatTime(releaseDate),
          date: releaseDate,
          color: this.getReleaseColor(release.release_type),
          borderColor: this.getReleaseBorderColor(release.release_type),
          data: release,
          businessUnitName: release.business_unit_id ? businessUnitMap.get(release.business_unit_id) : undefined
        });
      }



    });

    // Sort events by time
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

  getReleaseBorderColor(releaseType: string): string {
    const colors: Record<string, string> = {
      'Major release': '#93c5fd', // blue-300
      'Hotfix': '#fca5a5', // red-300
      'Data patch': '#fcd34d', // yellow-300
      'Hotfix & Data patch': '#d8b4fe' // purple-300
    };
    return colors[releaseType] || '#d1d5db'; // gray-300
  }

  openReleaseDetail(eventOrRelease: Release | CalendarEvent): void {
    let release: Release;
    if ('type' in eventOrRelease && (eventOrRelease.type === 'release' || eventOrRelease.type === 'stage')) {
      release = eventOrRelease.data;
    } else {
      release = eventOrRelease as Release;
    }

    this.selectedRelease.set(release);
    this.moreEventsDay.set(null);

    // Fetch workflow for this release type
    if (release.release_type) {
      this.workflowService.getByReleaseType(release.release_type).subscribe(workflow => {
        this.selectedWorkflow.set(workflow);
      });
    }
  }

  closeReleaseDetail(): void {
    this.selectedRelease.set(null);
    this.selectedWorkflow.set(null);
  }

  getSortedStages(release: Release | null): { key: string, value: any }[] {
    if (!release || !release.workflow_states) return [];

    return Object.entries(release.workflow_states)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([key, value]) => ({ key, value }));
  }

  getStageName(stageOrder: string): string {
    const workflow = this.selectedWorkflow();
    if (!workflow) return `Stage ${stageOrder}`;

    const stage = workflow.stages.find((s: any) => s.order.toString() === stageOrder);
    return stage ? stage.name : `Stage ${stageOrder}`;
  }

  formatDeadline(deadline: string | null): string {
    if (!deadline) return 'Not set';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOverdue(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  showMoreEvents(day: CalendarDay): void {
    this.moreEventsDay.set(day);
  }

  closeMoreEvents(): void {
    this.moreEventsDay.set(null);
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

  getBusinessUnitName(release: Release | null): string {
    if (!release || !release.business_unit_id) return '';
    return this.businessUnits().get(release.business_unit_id) || '';
  }
}
