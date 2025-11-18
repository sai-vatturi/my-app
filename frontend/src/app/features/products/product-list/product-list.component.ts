import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    AlertComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
  })
export class ProductListComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);

  constructor(public productService: ProductService) {}

  get products() {
    return this.productService.products;
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getAll().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load products');
      }
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    const productId = product.id || product._id;
    if (!productId) return;
    
    this.deleting.set(productId);

    this.productService.delete(productId).subscribe({
      next: () => {
        this.deleting.set(null);
      },
      error: (err) => {
        this.deleting.set(null);
        this.error.set(err.message || 'Failed to delete product');
      }
    });
  }
}
