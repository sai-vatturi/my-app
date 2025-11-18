import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Product, ProductCreate, ProductUpdate } from '../models/product.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsSignal = signal<Product[]>([]);
  products = this.productsSignal.asReadonly();

  constructor(private api: ApiService) {}

  getAll(): Observable<Product[]> {
    return this.api.get<Product[]>('/products').pipe(
      tap(products => {
        const normalized = products.map(p => ({ ...p, id: p.id || p._id }));
        this.productsSignal.set(normalized);
      })
    );
  }

  getById(id: string): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  create(product: ProductCreate): Observable<Product> {
    return this.api.post<Product>('/products', product).pipe(
      tap(newProduct => {
        this.productsSignal.update(products => [...products, newProduct]);
      })
    );
  }

  update(id: string, product: ProductUpdate): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, product).pipe(
      tap(updatedProduct => {
        this.productsSignal.update(products =>
          products.map(p => p.id === id ? updatedProduct : p)
        );
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`/products/${id}`).pipe(
      tap(() => {
        this.productsSignal.update(products =>
          products.filter(p => p.id !== id)
        );
      })
    );
  }
}
