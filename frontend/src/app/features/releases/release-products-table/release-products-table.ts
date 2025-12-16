import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReleaseProduct } from '../../../core/models/release.model';

@Component({
  selector: 'app-release-products-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './release-products-table.html',
  styleUrls: ['./release-products-table.scss']
})
export class ReleaseProductsTableComponent {
  @Input() products: ReleaseProduct[] = [];
  @Input() productMap: Map<string, string> = new Map();
  @Input() mode: 'view' | 'edit' = 'view';
  @Input() showRemove: boolean = true;

  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  expandedRows = signal<Set<number>>(new Set());

  getProductName(id: string): string {
    return this.productMap.get(id) || 'Unknown Product';
  }

  toggleRow(index: number): void {
    this.expandedRows.update(current => {
      const newSet = new Set(current);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  isExpanded(index: number): boolean {
    return this.expandedRows().has(index);
  }
}
